package com.minqian.wechatlib

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.tencent.mm.opensdk.modelmsg.SendAuth
import com.tencent.mm.opensdk.openapi.IWXAPI
import com.tencent.mm.opensdk.openapi.WXAPIFactory
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.URL

object WeChatBridge {
  @Volatile var api: IWXAPI? = null
    private set
  @Volatile var module: ReactNativeWechatLibModule? = null
  @Volatile var pendingAuth: CompletableDeferred<Map<String, Any?>>? = null
  @Volatile var pendingShare: CompletableDeferred<Map<String, Any?>>? = null
  /** 从微信跳回 App 的请求：JS 还没开始监听时（如被微信冷启动）先存着，开始监听后补发 */
  @Volatile var pendingLaunchFromWX: Map<String, Any?>? = null

  /** 微信开放平台文档规定的大小上限 */
  const val THUMB_MAX_BYTES = 32 * 1024                 // WXMediaMessage.thumbData
  const val MINI_PROGRAM_IMAGE_MAX_BYTES = 128 * 1024  // 小程序消息封面
  const val IMAGE_DATA_MAX_BYTES = 1024 * 1024         // WXImageObject.imageData（Android）

  fun emitLaunchFromWX(payload: Map<String, Any?>) {
    val m = module
    if (m != null) m.emit("onLaunchFromWX", payload) else pendingLaunchFromWX = payload
  }

  fun flushPendingLaunchFromWX() {
    val payload = pendingLaunchFromWX ?: return
    val m = module ?: return
    pendingLaunchFromWX = null
    m.emit("onLaunchFromWX", payload)
  }

  fun register(context: Context, appId: String) {
    val a = WXAPIFactory.createWXAPI(context.applicationContext, appId, true)
    if (!a.registerApp(appId)) {
      throw IllegalStateException("WXAPIFactory.registerApp returned false")
    }
    api = a
  }

  fun ensure(): IWXAPI = api ?: throw IllegalStateException("NOT_REGISTERED")

  fun apiVersion(): String = com.tencent.mm.opensdk.constants.Build.SDK_VERSION_NAME

  suspend fun sendAuth(scope: String, state: String): Map<String, Any?> {
    val a = ensure()
    pendingAuth?.cancel()
    val d = CompletableDeferred<Map<String, Any?>>()
    pendingAuth = d
    val req = SendAuth.Req().also { it.scope = scope; it.state = state }
    if (!a.sendReq(req)) {
      pendingAuth = null
      throw IllegalStateException("SEND_FAIL: sendReq returned false")
    }
    return d.await()
  }

  suspend fun loadImage(source: Map<String, Any?>?): ByteArray? {
    if (source == null) return null
    (source["base64"] as? String)?.takeIf { it.isNotEmpty() }?.let {
      return Base64.decode(it, Base64.DEFAULT)
    }
    val uri = source["uri"] as? String ?: return null
    return withContext(Dispatchers.IO) {
      if (uri.startsWith("file://")) java.io.File(java.net.URI(uri)).readBytes()
      else URL(uri).openStream().use { it.readBytes() }
    }
  }

  fun compressThumb(data: ByteArray): ByteArray = compressImage(data, THUMB_MAX_BYTES)

  /** 依次降低 JPEG 质量、缩小尺寸，直到不超过 maxBytes；本来就不超过或不是图片时原样返回 */
  fun compressImage(data: ByteArray, maxBytes: Int): ByteArray {
    if (data.size <= maxBytes) return data
    var bmp = BitmapFactory.decodeByteArray(data, 0, data.size) ?: return data
    var best = data
    val bos = ByteArrayOutputStream()
    repeat(8) {
      for (q in intArrayOf(80, 60, 40, 20)) {
        bos.reset()
        bmp.compress(Bitmap.CompressFormat.JPEG, q, bos)
        if (bos.size() <= maxBytes) return bos.toByteArray()
        if (bos.size() < best.size) best = bos.toByteArray()
      }
      val w = (bmp.width * 0.7).toInt()
      val h = (bmp.height * 0.7).toInt()
      if (w < 16 || h < 16) return best
      bmp = Bitmap.createScaledBitmap(bmp, w, h, true)
    }
    return best
  }
}
