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
  }
}
