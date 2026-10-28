# Third-party components

Sítio's distributed bundle includes the following third-party components. They
keep their own licenses; this repository does not relicense them.

| Component     | Version | License     | Notes                                                                                      |
| ------------- | ------- | ----------- | ------------------------------------------------------------------------------------------ |
| PixiJS        | 8.x     | MIT         | Rendering                                                                                  |
| React         | 19.x    | MIT         | UI                                                                                         |
| React DOM     | 19.x    | MIT         | UI                                                                                         |
| Pixelify Sans | bundled | SIL OFL 1.1 | [`apps/web/public/fonts/OFL-PixelifySans.txt`](apps/web/public/fonts/OFL-PixelifySans.txt) |

Build and test dependencies (Vite, TypeScript, ESLint, Vitest, Playwright) are
not part of the distributed bundle. See `pnpm-lock.yaml` for the full tree.
