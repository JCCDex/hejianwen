import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
import { HttpsProxyAgent } from 'https-proxy-agent'

// ── 出站代理配置 ────────────────────────────────────────────────────────────────
// Vite dev proxy 本身运行在 Node.js 里，若 Binance 在本机也被封锁（TLS 中断），
// 需要让出站请求走本地代理工具（Clash / V2Ray / Shadowsocks 等）。
// 使用方式（二选一）：
//   1. 启动前设置环境变量：HTTPS_PROXY=http://127.0.0.1:7890 npm run dev
//   2. 在 .env.local 文件中添加：HTTPS_PROXY=http://127.0.0.1:7890
//      （Clash 默认端口 7890，V2RayX 默认 1087，按实际修改）
const _outProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
const _agent = _outProxy ? new HttpsProxyAgent(_outProxy) : undefined;

if (_agent) {
  // eslint-disable-next-line no-console
  console.log(`\x1b[36m[vite-proxy]\x1b[0m 出站代理已启用: ${_outProxy}`);
}

const withAgent = (cfg) => (_agent ? { ...cfg, agent: _agent } : cfg);

export default defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      include: ['src/**/*.jsx', 'src/**/*.js'],
      exclude: [/node_modules/],
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.7,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false
      }
    })
  ],
  server: {
    proxy: {
      // Spot REST — https://api.binance.com/api/v3/...
      '/api/v3': withAgent({
        target: 'https://api.binance.com',
        changeOrigin: true,
        secure: true,
      }),
      // Futures REST — https://fapi.binance.com/fapi/...
      '/fapi': withAgent({
        target: 'https://fapi.binance.com',
        changeOrigin: true,
        secure: true,
      }),
      // WebSocket stream — wss://stream.binance.com:9443/ws/...
      '/binance-ws': withAgent({
        target: 'wss://stream.binance.com:9443',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/binance-ws/, ''),
      }),
      // IP 地理位置查询 — https://ipapi.co/json/
      '/ipapi': withAgent({
        target: 'https://ipapi.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ipapi/, ''),
      }),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      reporter: ['text', 'lcov'],
    },
  },
})