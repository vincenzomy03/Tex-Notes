/// <reference types="vite/client" />

declare module '*.tex?raw' {
  const content: string;
  export default content;
}

declare module '*?url' {
  const src: string;
  export default src;
}
