// vite.config.js
const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/rounded-box.ts"),
      name: "rounded-box",
      fileName: (format) => `rounded-box.${format}.js`,
    },
  },
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, "example/index.html"),
    },
  },
});
