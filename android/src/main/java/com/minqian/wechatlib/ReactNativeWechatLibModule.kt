package com.minqian.wechatlib

import com.tencent.mm.opensdk.modelbiz.WXLaunchMiniProgram
import com.tencent.mm.opensdk.modelmsg.SendMessageToWX
import com.tencent.mm.opensdk.modelmsg.WXFileObject
import com.tencent.mm.opensdk.modelmsg.WXImageObject
import com.tencent.mm.opensdk.modelmsg.WXMediaMessage
import com.tencent.mm.opensdk.modelmsg.WXMiniProgramObject
import com.tencent.mm.opensdk.modelmsg.WXMusicVideoObject
import com.tencent.mm.opensdk.modelmsg.WXTextObject
import com.tencent.mm.opensdk.modelmsg.WXVideoObject
import com.tencent.mm.opensdk.modelmsg.WXWebpageObject
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred

class ReactNativeWechatLibModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeWechatLib")
    Events("onAuthResp", "onShareResp", "onLaunchMiniProgramResp", "onLaunchFromWX")

    // 被微信冷启动时，跳回请求先于 JS 监听到达，开始监听后补发
    OnStartObserving("onLaunchFromWX") { WeChatBridge.flushPendingLaunchFromWX() }

    OnCreate { WeChatBridge.module = this@ReactNativeWechatLibModule }
    OnDestroy {
      if (WeChatBridge.module === this@ReactNativeWechatLibModule) {
        WeChatBridge.module = null
      }
    }

    AsyncFunction("registerApp") { appId: String, _: String? ->
      WeChatBridge.register(appContext.reactContext!!, appId)
    }
    AsyncFunction("isWXAppInstalled") { WeChatBridge.api?.isWXAppInstalled == true }
    AsyncFunction("getApiVersion") { WeChatBridge.apiVersion() }
    AsyncFunction("openWXApp") { WeChatBridge.api?.openWXApp() == true }

    AsyncFunction("sendAuthRequest") Coroutine { scope: String, state: String ->
      WeChatBridge.sendAuth(scope, state)
    }

    AsyncFunction("shareText") Coroutine { text: String, scene: Int ->
      sendShare(scene) {
        val obj = WXTextObject().apply { this.text = text }
        WXMediaMessage().apply { mediaObject = obj; description = text }
      }
    }

    AsyncFunction("shareImage") Coroutine { image: Map<String, Any?>, scene: Int ->
      val raw = WeChatBridge.loadImage(image) ?: error("INVALID_PARAM: image required")
      // 文档：Android imageData 不超过 1MB；超出时压缩
      val bytes = WeChatBridge.compressImage(raw, WeChatBridge.IMAGE_DATA_MAX_BYTES)
      sendShare(scene) {
        val obj = WXImageObject(bytes)
        WXMediaMessage().apply { mediaObject = obj }
      }
    }

    AsyncFunction("shareWebpage") Coroutine { url: String, title: String?, desc: String?, thumb: Map<String, Any?>?, scene: Int ->
      val thumbBytes = WeChatBridge.loadImage(thumb)
      sendShare(scene) {
        val obj = WXWebpageObject().apply { webpageUrl = url }
        WXMediaMessage().apply {
          mediaObject = obj
          this.title = title ?: ""
          this.description = desc ?: ""
          thumbBytes?.let { thumbData = WeChatBridge.compressThumb(it) }
        }
      }
    }

    AsyncFunction("shareMiniProgram") Coroutine { opts: Map<String, Any?> ->
      val url = opts["webpageUrl"] as String
      val userName = opts["userName"] as String
      // JS 数字经字典传入时是 Double，统一按 Number 取整
      val scene = (opts["scene"] as Number).toInt()
      val hdImage = WeChatBridge.loadImage(opts["hdImageData"] as? Map<String, Any?>)
      sendShare(scene) {
        val obj = WXMiniProgramObject().apply {
          webpageUrl = url
          this.userName = userName
          path = opts["path"] as? String ?: ""
          miniprogramType = (opts["miniProgramType"] as? Number)?.toInt() ?: 0
          withShareTicket = (opts["withShareTicket"] as? Boolean) ?: false
        }
        WXMediaMessage().apply {
          mediaObject = obj
          title = opts["title"] as? String ?: ""
          description = opts["description"] as? String ?: ""
          // 文档：小程序消息封面小于 128KB
          hdImage?.let { thumbData = WeChatBridge.compressImage(it, WeChatBridge.MINI_PROGRAM_IMAGE_MAX_BYTES) }
        }
      }
    }

    AsyncFunction("launchMiniProgram") { userName: String, path: String?, type: Int ->
      val api = WeChatBridge.ensure()
      val req = WXLaunchMiniProgram.Req().apply {
        this.userName = userName
        // SDK 默认 path 为空字符串（打开首页）；设成 null 微信会显示「页面不存在」，所以没传时不覆盖
        path?.let { this.path = it }
        miniprogramType = type
      }
      if (!api.sendReq(req)) error("SEND_FAIL: sendReq returned false")
    }

    AsyncFunction("shareVideo") Coroutine { videoUrl: String?, lowBandUrl: String?, title: String?, desc: String?, thumb: Map<String, Any?>?, scene: Int ->
      val thumbBytes = WeChatBridge.loadImage(thumb)
      sendShare(scene) {
        val obj = WXVideoObject().apply {
          videoUrl?.let { this.videoUrl = it }
          lowBandUrl?.let { this.videoLowBandUrl = it }
        }
        WXMediaMessage(obj).apply {
          this.title = title ?: ""
          this.description = desc ?: ""
          thumbBytes?.let { thumbData = WeChatBridge.compressThumb(it) }
        }
      }
    }

    AsyncFunction("shareMusicVideo") Coroutine { opts: Map<String, Any?> ->
      val scene = (opts["scene"] as Number).toInt()
      val thumbBytes = WeChatBridge.loadImage(opts["thumb"] as? Map<String, Any?>)
      sendShare(scene) {
        val obj = WXMusicVideoObject().apply {
          musicUrl = opts["musicUrl"] as String
          musicDataUrl = opts["musicDataUrl"] as String
          singerName = opts["singerName"] as String
          duration = (opts["duration"] as Number).toInt()
          (opts["songLyric"] as? String)?.let { songLyric = it }
          (opts["albumName"] as? String)?.let { albumName = it }
          (opts["musicGenre"] as? String)?.let { musicGenre = it }
          (opts["issueDate"] as? Number)?.let { issueDate = it.toLong() }
          (opts["identification"] as? String)?.let { identification = it }
        }
        WXMediaMessage(obj).apply {
          title = opts["title"] as String
          description = opts["description"] as? String ?: ""
          messageExt = opts["messageExt"] as? String
          thumbBytes?.let { thumbData = WeChatBridge.compressThumb(it) }
        }
      }
    }

    AsyncFunction("shareFile") Coroutine { file: Map<String, Any?>, _: String, title: String, desc: String?, thumb: Map<String, Any?>?, scene: Int ->
      // Android 的 WXFileObject 没有扩展名字段；以二进制数据分享，不需要 FileProvider
      val bytes = WeChatBridge.loadImage(file) ?: error("INVALID_PARAM: file required")
      val thumbBytes = WeChatBridge.loadImage(thumb)
      sendShare(scene) {
        val obj = WXFileObject(bytes)
        WXMediaMessage(obj).apply {
          this.title = title
          this.description = desc ?: ""
          thumbBytes?.let { thumbData = WeChatBridge.compressThumb(it) }
        }
      }
    }
  }

  private suspend fun sendShare(scene: Int, build: () -> WXMediaMessage): Map<String, Any?> {
    val api = WeChatBridge.ensure()
    WeChatBridge.pendingShare?.cancel()
    val d = CompletableDeferred<Map<String, Any?>>()
    WeChatBridge.pendingShare = d
    val req = SendMessageToWX.Req().apply {
      message = build()
      this.scene = scene
      transaction = System.currentTimeMillis().toString()
    }
    if (!api.sendReq(req)) {
      WeChatBridge.pendingShare = null
      error("SEND_FAIL: sendReq returned false")
    }
    return d.await()
  }

  internal fun emit(event: String, body: Map<String, Any?>) {
    sendEvent(event, body)
  }
}
