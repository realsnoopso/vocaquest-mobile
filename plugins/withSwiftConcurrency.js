const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSwiftConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      // Add SWIFT_STRICT_CONCURRENCY to all pod targets via a separate ruby script
      const podfilePath = path.join(projectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');
        
        const swiftFix = `
  # Fix Swift 6 concurrency errors in Xcode 16
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
`;
        
        if (!podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
          podfile = podfile.replace(
            /(post_install do \|installer\|)/m,
            '$1' + swiftFix
          );
          fs.writeFileSync(podfilePath, podfile);
        }
      }
      
      return config;
    },
  ]);
};
