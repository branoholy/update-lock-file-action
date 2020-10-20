/* eslint-disable import/no-commonjs */

// Config
module.exports = (api) => {
  api.cache.using(() => process.env.NODE_ENV === 'development');

  return {
    // Preset ordering is reversed (last to first).
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current'
          },
          modules: 'commonjs'
        }
      ],
      '@babel/preset-typescript'
    ]
  };
};
