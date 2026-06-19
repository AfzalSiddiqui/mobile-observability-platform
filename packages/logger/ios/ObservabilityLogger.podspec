require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name         = "ObservabilityLogger"
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = "https://github.com/example/mobile-observability-platform"
  s.license      = "MIT"
  s.author       = "Observability Team"
  s.source       = { :git => "https://github.com/example/mobile-observability-platform.git", :tag => s.version }

  s.platforms    = { :ios => "13.0" }
  s.source_files = "ObservabilityLogger/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  s.dependency "React-Core"

  install_modules_dependencies(s) if defined?(install_modules_dependencies)
end
