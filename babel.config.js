module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved the worklet transform into react-native-worklets.
    // `react-native-reanimated/plugin` is now just a shim re-exporting this.
    // It must be LAST in the plugin list.
    plugins: ['react-native-worklets/plugin'],
  };
};
