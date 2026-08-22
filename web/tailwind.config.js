/** Tailwind 配置：颜色全部走 CSS 变量，方便运行时自定义主题 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas-bg)",
        panel: "var(--color-panel-bg)",
        "panel-border": "var(--color-panel-border)",
        accent: "var(--color-accent)",
        "accent-fg": "var(--color-accent-fg)",
        "node-bg": "var(--color-node-bg)",
        "node-border": "var(--color-node-border)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
      },
      borderRadius: {
        node: "var(--radius-node)",
      },
    },
  },
  plugins: [],
};
