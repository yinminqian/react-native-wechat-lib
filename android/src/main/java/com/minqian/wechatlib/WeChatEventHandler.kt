package com.minqian.wechatlib

import com.tencent.mm.opensdk.modelbase.BaseReq
import com.tencent.mm.opensdk.modelbase.BaseResp
import com.tencent.mm.opensdk.modelbiz.WXLaunchMiniProgram
import com.tencent.mm.opensdk.modelmsg.SendAuth
import com.tencent.mm.opensdk.modelmsg.SendMessageToWX
import com.tencent.mm.opensdk.modelmsg.ShowMessageFromWX
import com.tencent.mm.opensdk.modelmsg.WXMusicVideoObject
import com.tencent.mm.opensdk.openapi.IWXAPIEventHandler

object WeChatEventHandler : IWXAPIEventHandler {
  /** 最近一次处理的是否为「从微信跳回 App」的请求（WXEntryActivityBase 据此把 App 带到前台） */
  @Volatile var lastWasShowMessage = false
    private set

  override fun onReq(req: BaseReq) {
    lastWasShowMessage = false
    // 从微信跳回（如音乐视频播放器里的跳转入口）：带回分享时写入的 messageExt / identification
    if (req !is ShowMessageFromWX.Req) return
    lastWasShowMessage = true
    val message = req.message
    WeChatBridge.emitLaunchFromWX(
      mapOf(
        "messageExt" to message?.messageExt,
        "identification" to (message?.mediaObject as? WXMusicVideoObject)?.identification,
        "lang" to req.lang,
        "country" to req.country,
      ),
    )
  }

  override fun onResp(resp: BaseResp) {
    when (resp) {
      is SendAuth.Resp -> {
        val payload = mapOf<String, Any?>(
          "errCode" to resp.errCode,
          "errStr" to resp.errStr,
          "code" to resp.code,
          "state" to resp.state,
          "lang" to resp.lang,
          "country" to resp.country,
        )
        WeChatBridge.module?.emit("onAuthResp", payload)
        WeChatBridge.pendingAuth?.complete(payload)
        WeChatBridge.pendingAuth = null
      }
      is WXLaunchMiniProgram.Resp -> {
        WeChatBridge.module?.emit(
          "onLaunchMiniProgramResp",
          mapOf<String, Any?>("errCode" to resp.errCode, "errStr" to resp.errStr, "extMsg" to resp.extMsg),
        )
      }
      is SendMessageToWX.Resp -> {
        val payload = mapOf<String, Any?>(
          "errCode" to resp.errCode,
          "errStr" to resp.errStr,
          "type" to resp.type,
        )
        WeChatBridge.module?.emit("onShareResp", payload)
        WeChatBridge.pendingShare?.complete(payload)
        WeChatBridge.pendingShare = null
      }
    }
  }
}
