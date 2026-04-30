const { withPodfile } = require('expo/config-plugins');

module.exports = function withSwiftConcurrency(config) {
  return withPodfile(config, (config) => {
    // Fix: Swift 6 concurrency warnings treated as errors in Xcode 16
    const postInstallHook = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
`;
    const podfile = config.modResults;
    
    if (podfile.includes('post_install') && !podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
      // Insert Swift concurrency fix into post_install block
      config.modResults = podfile.replace(
        /(post_install do \|installer\|)/,
        '$1' + postInstallHook
      );
    }
    
    return config;
  });
};
