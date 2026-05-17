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

  fun compressThumb(data: ByteArray, maxKB: Int = 32): ByteArray {
    val bmp = BitmapFactory.decodeByteArray(data, 0, data.size) ?: return data
    val bos = ByteArrayOutputStream()
    var q = 90
    do {
      bos.reset()
      bmp.compress(Bitmap.CompressFormat.JPEG, q, bos)
      q -= 10
    } while (bos.size() > maxKB * 1024 && q > 10)
    return bos.toByteArray()
  }
}
