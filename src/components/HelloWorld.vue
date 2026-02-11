<template>
    <h1>{{ name }}</h1>
</template>

<script setup lang="ts">
    defineProps<{
        name: string
    }>()
</script>