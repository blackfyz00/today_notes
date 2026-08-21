// src/services/ModalService.ts
import { ref, markRaw, type Component } from 'vue';

// Описываем структуру модального окна в стеке
export interface ActiveModal {
  id: string;
  component: Component; // Сам Vue-компонент
  props: Record<string, any>; // Пропсы, которые ему нужны
}

export class ModalService {
  private static instance: ModalService | null = null;
  
  // Реактивный массив (стек) открытых окон
  private modals = ref<ActiveModal[]>([]);

  private constructor() {}

  public static getInstance(): ModalService {
    if (!ModalService.instance) {
      ModalService.instance = new ModalService();
    }
    return ModalService.instance;
  }

  /**
   * Возвращает список всех открытых модалок для рендеринга
   */
  public getModals() {
    return this.modals.value;
  }

  /**
   * Открывает любое окно и кладет его на вершину стека
   * @param component Vue-компонент модалки (например, NewNoteModal)
   * @param props Объект с пропсами для этой модалки
   */
  public open(component: Component, props: Record<string, any> = {}): string {
    const id = crypto.randomUUID(); // Уникальный ID для ключа в v-for
    
    this.modals.value.push({
      id,
      // markRaw говорит Vue не делать тяжелую обертку реактивности вокруг самого файла компонента
      component: markRaw(component), 
      props
    });

    return id;
  }

  /**
   * Закрывает окно по его ID
   */
  public close(id: string) {
    this.modals.value = this.modals.value.filter(modal => modal.id !== id);
  }

  /**
   * Полностью очищает стек (закрывает всё)
   */
  public closeAll() {
    this.modals.value = [];
  }
}

// Экспортируем готовый инстанс
export const modalService = ModalService.getInstance();
