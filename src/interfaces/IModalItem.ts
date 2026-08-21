import { type Component } from 'vue';

export interface IModalItem {
  id: string;
  component: Component;
  props?: Record<string, any>;
}