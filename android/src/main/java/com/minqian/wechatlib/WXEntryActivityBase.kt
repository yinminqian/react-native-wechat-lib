package com.minqian.wechatlib

import android.app.Activity
import android.content.Intent
import android.os.Bundle

open class WXEntryActivityBase : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handle(intent)
    finish()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handle(intent)
    finish()
  }

  private fun handle(intent: Intent) {
    val api = WeChatBridge.api ?: return
    api.handleIntent(intent, WeChatEventHandler)
    // 文档要求：处理 onReq 时也要正确关闭 WXEntryActivity。从微信跳回 App 的请求，
    // 关闭前把 App 带到前台，否则 App 未运行时跳回后看不到任何界面
    if (WeChatEventHandler.lastWasShowMessage) {
      packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        startActivity(launch)
      }
    }
  }
}
