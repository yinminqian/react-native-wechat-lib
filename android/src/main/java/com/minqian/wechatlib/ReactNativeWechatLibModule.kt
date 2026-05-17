package com.minqian.wechatlib

import com.tencent.mm.opensdk.modelmsg.SendMessageToWX
import com.tencent.mm.opensdk.modelmsg.WXImageObject
import com.tencent.mm.opensdk.modelmsg.WXMediaMessage
import com.tencent.mm.opensdk.modelmsg.WXMiniProgramObject
import com.tencent.mm.opensdk.modelmsg.WXTextObject
import com.tencent.mm.opensdk.modelmsg.WXWebpageObject
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred

class ReactNativeWechatLibModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeWechatLib")
    Events("onAuthResp", "onShareResp")

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
      val bytes = WeChatBridge.loadImage(image) ?: error("INVALID_PARAM: image required")
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
      val scene = opts["scene"] as Int
      val hdImage = WeChatBridge.loadImage(opts["hdImageData"] as? Map<String, Any?>)
      sendShare(scene) {
        val obj = WXMiniProgramObject().apply {
          webpageUrl = url
          this.userName = userName
          path = opts["path"] as? String ?: ""
          miniprogramType = (opts["miniProgramType"] as? Int) ?: 0
          withShareTicket = (opts["withShareTicket"] as? Boolean) ?: false
        }
        WXMediaMessage().apply {
          mediaObject = obj
          title = opts["title"] as? String ?: ""
          description = opts["description"] as? String ?: ""
          hdImage?.let { thumbData = it }
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
