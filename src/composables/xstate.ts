import { createMachine } from 'xstate';

export const loadingMachine = createMachine({
  id: 'loader',
  initial: 'idle',
  states: {
    idle: {
      on: { FETCH: 'loading' }
    },
    loading: {
      on: { 
        SUCCESS: 'idle',
        ERROR: 'idle' 
      }
    }
  }
});
