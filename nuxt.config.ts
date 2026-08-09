export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  // One family only, differentiated by weight. See tokens.css.
  fonts: {
    families: [
      { name: 'Roboto', provider: 'google', weights: [300, 400, 500, 700], styles: ['normal', 'italic'] },
    ],
  },

  app: {
    head: {
      title: 'Imagine',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#121212' },
      ],
    },
  },

  // NOTE ON COOP/COEP: the master spec calls for these headers alongside the MP4
  // export. They are deliberately NOT set, and that is now a settled decision
  // rather than a deferral.
  //
  // They are required only by ffmpeg's MULTI-THREADED core, which needs
  // SharedArrayBuffer. Cross-origin isolation is an application-wide switch:
  // once on, every image the editor loads — including everything served from R2
  // later — must carry CORP/CORS headers or it silently fails to load. That is a
  // permanent constraint on the whole product in exchange for faster encoding in
  // one optional tool.
  //
  // So `useAudio` uses the single-threaded core, served same-origin from
  // /public/ffmpeg. Encoding is slower; nothing else in the app is constrained.
  // Revisit only if encode time becomes a real complaint AND R2 is confirmed to
  // serve Cross-Origin-Resource-Policy headers.

  typescript: {
    typeCheck: false,
    strict: true,
  },
})
