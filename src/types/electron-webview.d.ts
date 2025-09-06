declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow using <webview /> in TSX without errors
      webview: any
    }
  }
}
export {}

