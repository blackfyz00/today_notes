<script setup lang="ts">
import { onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import { useNotesStore } from './components/notesStore';
import { useNotificationsSync } from './composables/localPushService';

const notesStore = useNotesStore();
const { initNotificationWatch } = useNotificationsSync();

onMounted(async () => {
  initNotificationWatch();

  const token = localStorage.getItem('token');
  if (token) {
    await notesStore.fetchNotes(new Date());
  }
});
</script>

<template>
  <Sidebar />
  <router-view />
</template>
