/* eslint-disable import/no-commonjs */

// Presets
const envPreset = [
  '@babel/preset-env',
  {
    targets: {
      node: 'current'
    },
    modules: 'commonjs'
  }
];

const typescriptPreset = '@babel/preset-typescript';

// Config
module.exports = (api) => {
  api.cache.using(() => process.env.NODE_ENV === 'development');

  // Plugins run before presets. Plugin ordering is first to last.
  const plugins = [
    // Workaround: The option "modules: 'commonjs'" of @babel/preset-env should
    // transpile import to require but it seems like it doesn't work so
    // the plugin is used manually.
    '@babel/plugin-transform-modules-commonjs'
  ];

  // Preset ordering is reversed (last to first).
  const presets = [envPreset, typescriptPreset];

  return {
    plugins,
    presets
  };
};
