const { withPodfile } = require('expo/config-plugins');

module.exports = (config) => {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    
    // Add SWIFT_STRICT_CONCURRENCY to the post_install block
    const swiftFix = `
  # Fix Swift 6 concurrency warnings in Xcode 16
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
`;
    
    if (!podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
      config.modResults.contents = podfile.replace(
        /(post_install do \|installer\|)/,
        '$1' + swiftFix
      );
    }
    
    return config;
  });
};
