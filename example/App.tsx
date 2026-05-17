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
  addAuthListener,
  addShareListener,
  WeChatScene,
} from '@minqian/react-native-wechat-lib';

export default function App() {
  const [appId, setAppId] = useState('wxYOUR_APPID_HERE');
  const [ul, setUL] = useState('https://your.domain.com/wechat/');
  const [scene, setScene] = useState<WeChatScene>(WeChatScene.Session);
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) => setLog((l) => [new Date().toLocaleTimeString() + ' ' + s, ...l]);

  useEffect(() => {
    const off1 = addAuthListener((r) => append('event onAuthResp: ' + JSON.stringify(r)));
    const off2 = addShareListener((r) => append('event onShareResp: ' + JSON.stringify(r)));
    return () => { off1(); off2(); };
  }, []);

  const safe = async (label: string, fn: () => Promise<unknown>) => {
    try { append(label + ' → ' + JSON.stringify(await fn())); }
    catch (e) { append(label + ' ERROR: ' + (e instanceof Error ? e.message : String(e))); }
  };

  return (
    <View style={styles.root}>
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

      <Text style={styles.h2}>Log</Text>
      <Button title="Clear" onPress={() => setLog([])} />
      <ScrollView style={styles.log}>
        {log.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, paddingTop: 60 },
  h: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  h2: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginVertical: 4 },
  row: { flexDirection: 'row', gap: 8 },
  log: { flex: 1, marginTop: 8, backgroundColor: '#fafafa' },
  logLine: { fontSize: 12, fontFamily: 'Menlo', paddingVertical: 2 },
});
