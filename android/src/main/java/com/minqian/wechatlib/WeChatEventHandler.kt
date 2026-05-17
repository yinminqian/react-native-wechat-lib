package com.minqian.wechatlib

import com.tencent.mm.opensdk.modelbase.BaseReq
import com.tencent.mm.opensdk.modelbase.BaseResp
import com.tencent.mm.opensdk.modelmsg.SendAuth
import com.tencent.mm.opensdk.modelmsg.SendMessageToWX
import com.tencent.mm.opensdk.openapi.IWXAPIEventHandler

object WeChatEventHandler : IWXAPIEventHandler {
  override fun onReq(req: BaseReq) {}

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
