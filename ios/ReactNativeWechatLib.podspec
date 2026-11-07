require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ReactNativeWechatLib'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage'] || 'https://github.com/yinminqian/react-native-wechat-lib'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/yinminqian/react-native-wechat-lib.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'WechatOpenSDK-XCFramework', '~> 2.0.9'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'OTHER_LDFLAGS' => '$(inherited) -ObjC'
  }

  s.source_files = '**/*.{h,m,swift}'
end
