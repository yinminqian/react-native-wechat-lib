import React, { useState, useEffect } from 'react';
import { Button, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import {
  registerApp,
  isWXAppInstalled,
  getApiVersion,
  openWXApp,
  sendAuthRequest,
  shareText,
  shareImage,
  shareWebpage,
  shareMiniProgram,
  launchMiniProgram,
  shareVideo,
  shareMusicVideo,
  shareFile,
  addAuthListener,
  addShareListener,
  addLaunchMiniProgramListener,
  addLaunchFromWXListener,
  WeChatScene,
} from '@minqian/react-native-wechat-lib';

export default function App() {
  const [appId, setAppId] = useState(process.env.EXPO_PUBLIC_WECHAT_APP_ID ?? 'wxYOUR_APPID_HERE');
  const [ul, setUL] = useState(process.env.EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK ?? 'https://your.domain.com/wechat/');
  const [scene, setScene] = useState<WeChatScene>(WeChatScene.Session);
  const [miniUserName, setMiniUserName] = useState('gh_xxxxxxxx');
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) => {
    // 同时打到系统日志（adb logcat 的 ReactNativeJS 标签），方便真机调试时读取结果
    console.log('[wechat-example] ' + s);
    setLog((l) => [new Date().toLocaleTimeString() + ' ' + s, ...l]);
  };

  useEffect(() => {
    const off1 = addAuthListener((r) => append('event onAuthResp: ' + JSON.stringify(r)));
    const off2 = addShareListener((r) => append('event onShareResp: ' + JSON.stringify(r)));
    const off3 = addLaunchMiniProgramListener((r) => append('event onLaunchMiniProgramResp: ' + JSON.stringify(r)));
    const off4 = addLaunchFromWXListener((r) => append('event onLaunchFromWX: ' + JSON.stringify(r)));
    return () => { off1(); off2(); off3(); off4(); };
  }, []);

  const safe = async (label: string, fn: () => Promise<unknown>) => {
    try { append(label + ' → ' + JSON.stringify(await fn())); }
    catch (e) { append(label + ' ERROR: ' + (e instanceof Error ? e.message : String(e))); }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h}>react-native-wechat-lib Example</Text>
      <TextInput style={styles.input} value={appId} onChangeText={setAppId} placeholder="AppID" />
      <TextInput style={styles.input} value={ul} onChangeText={setUL} placeholder="Universal Link" />
      <Button title="Register App" onPress={() => safe('registerApp', () => registerApp(appId, ul))} />
      <Button title="Is WeChat Installed?" onPress={() => safe('isInstalled', isWXAppInstalled)} />
      <Button title="Get API Version" onPress={() => safe('apiVersion', getApiVersion)} />
      <Button title="Open WeChat App" onPress={() => safe('openWXApp', openWXApp)} />

      <Text style={styles.h2}>Login</Text>
      <Button title="sendAuthRequest" onPress={() => safe('auth', () => sendAuthRequest())} />

      <Text style={styles.h2}>Share — scene: {WeChatScene[scene]}</Text>
      <View style={styles.row}>
        <Button title="Session" onPress={() => setScene(WeChatScene.Session)} />
        <Button title="Timeline" onPress={() => setScene(WeChatScene.Timeline)} />
        <Button title="Favorite" onPress={() => setScene(WeChatScene.Favorite)} />
      </View>
      <Button title="Share Text" onPress={() => safe('text', () => shareText({ text: 'Hello WeChat', scene }))} />
      <Button title="Share Image (uri)" onPress={() => safe('image-uri', () => shareImage({ image: { uri: 'https://placehold.co/200/png' }, scene }))} />
      <Button title="Share Webpage" onPress={() => safe('web', () => shareWebpage({ webpageUrl: 'https://expo.dev', title: 'Expo', description: 'Universal app platform', scene }))} />
      <Button title="Share MiniProgram" onPress={() => safe('mini', () => shareMiniProgram({
        webpageUrl: 'https://expo.dev', userName: 'gh_xxxxxxxx', path: 'pages/index', title: 'Demo',
      }))} />

      <Button title="Share Video" onPress={() => safe('video', () => shareVideo({
        videoUrl: 'https://v.qq.com/', title: 'Video', description: 'shareVideo', scene,
      }))} />
      <Button title="Share Music Video (needs permission)" onPress={() => safe('musicVideo', () => shareMusicVideo({
        title: 'Song', musicUrl: 'https://example.com/song', musicDataUrl: 'https://example.com/song.mp3',
        singerName: 'Singer', duration: 120000, identification: 'song-1', messageExt: 'ext-1', scene,
      }))} />
      <Button title="Share File (PDF)" onPress={() => safe('file', () => shareFile({
        file: { uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        title: 'dummy.pdf', scene,
      }))} />

      <Text style={styles.h2}>Mini Program</Text>
      <TextInput style={styles.input} value={miniUserName} onChangeText={setMiniUserName} placeholder="gh_ original id" />
      <Button title="Launch MiniProgram" onPress={() => safe('launchMini', () => launchMiniProgram({ userName: miniUserName }))} />

      <Text style={styles.h2}>Log</Text>
      <Button title="Clear" onPress={() => setLog([])} />
      <View style={styles.log}>
        {log.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  h2: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginVertical: 4 },
  row: { flexDirection: 'row', gap: 8 },
  log: { marginTop: 8, minHeight: 120, backgroundColor: '#fafafa' },
  logLine: { fontSize: 12, fontFamily: 'Menlo', paddingVertical: 2 },
});
