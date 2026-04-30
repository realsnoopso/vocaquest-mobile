const { withPlugins, withXcodeProject } = require('expo/config-plugins');

const withSwiftStrictConcurrency = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    // Set SWIFT_STRICT_CONCURRENCY to minimal for all build configurations
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        buildSettings['SWIFT_STRICT_CONCURRENCY'] = 'minimal';
      }
    }
    
    return config;
  });
};

module.exports = withSwiftStrictConcurrency;
