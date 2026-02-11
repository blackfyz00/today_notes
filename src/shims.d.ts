// src/shims-vue.d.ts
declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}