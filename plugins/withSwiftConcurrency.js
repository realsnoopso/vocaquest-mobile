const { withDangerousMod, withPlugins } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSwiftStrictConcurrency(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      
      const postInstallHook = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
`;
      
      if (!podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
        // Insert into the post_install block
        podfile = podfile.replace(
          /(post_install do \|installer\|)/,
          '$1' + postInstallHook
        );
        fs.writeFileSync(podfilePath, podfile);
      }
      
      return config;
    },
  ]);
}

module.exports = withSwiftStrictConcurrency;
