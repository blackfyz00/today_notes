<!-- src/views/NewNoteModal.vue -->
<template>
  <div v-if="show" class="note-modal-overlay" :class="{ 'dark-theme': editorTheme === 'dark' }" @click="closeModal">
    <div class="note-editor" @click.stop>
      <header class="editor-header">
        <button class="back-btn" @click="closeModal">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h1 class="editor-title">{{ isEditing ? t('NewNote.edit') : t('NewNote.newNote') }}</h1>
      </header>

      <div class="editor-area">
        <input 
          maxlength="15"
          v-model="localTitle"
          class="note-title-input"
          :placeholder="t('NewNote.title_placeholder')"
          @input="isDirty = true"
          :disabled="isLoadingBtnClicked === 'loading'"
        />
        
        <MdEditor 
          v-model="localContent" 
          language="ru-RU" 
          :theme="editorTheme"
          :preview="false"
          :previewOnly="isEditing"
          @on-upload-img="onUploadFile"
          :toolbars="['bold', 'italic', 'strike', 'unorderedList', 'orderedList', 'image', 'code', 'preview', 'previewOnly', 'fullscreen']"
          :placeholder="t('NewNote.start_typing')"
          class="note-md-editor"
          :disabled="isLoadingBtnClicked === 'loading'"
        />
      </div>

      <div class="editor-actions">
        <button class="submit-btn save-btn" 
          :disabled="isLoadingBtnClicked === 'loading'"
          @click="saveNote">{{ t("NewNote.save") }}</button>
        <button v-if="isEditing" class="submit-btn delete-btn" 
          :disabled="isLoadingBtnClicked === 'loading'"
          @click="deleteNote">{{ t("NewNote.delete") }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, toRaw, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MdEditor, config } from 'md-editor-v3'
import RU_LOCALE from '@/locales/md-locale.ts'
import 'md-editor-v3/lib/style.css'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { ZipPacker } from '@/services/ZipPacker'
import { LocalDB} from '@/services/IndexedDB' 
import { useTechnicalStore } from '@/services/TechnicalStore'
import { Note } from "@/services/Note";
import { InteractiveDoc } from "@/services/InteractiveDoc";
import { useSyncStore } from '@/services/SyncStore'

const syncStore = useSyncStore()
const technicalStore = useTechnicalStore()

config({
  editorConfig: {
    languageUserDefined: {
      'ru-RU': RU_LOCALE,
      'en': "default"
    }
  }
})

const { t } = useI18n()
const editorTheme = ref('light')
const isLoadingBtnClicked = computed(() => technicalStore.status)
let backButtonListener = null

// ⭐ ИЗМЕНЕНО: modelValue → show
const props = defineProps({
  show: { type: Boolean, default: false },  // Было modelValue
  note: { type: Object, default: null },
  isEditing: { type: Boolean, default: false },
  selectedDate: { type: [String, Date], default: null } 
})

const emit = defineEmits(['close', 'saved', 'deleted'])

// ⭐ ДОБАВЛЕНО: метод closeModal
const closeModal = () => {
  emit('close')
}

const localTitle = ref('')
const localContent = ref('')
const isDirty = ref(false)

const localMediaFiles = ref(new Map())

const registerBackButton = () => {
  if (!Capacitor.isNativePlatform()) return
  
  backButtonListener = App.addListener('backButton', () => {
    if (props.show) {  // ⭐ ИЗМЕНЕНО: modelValue → show
      closeModal()
    }
  })
}

const unregisterBackButton = () => {
  if (backButtonListener) {
    backButtonListener.remove()
    backButtonListener = null
  }
}

const cleanupBlobUrls = () => {
  localMediaFiles.value.forEach(({ url }) => {
    try {
      URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('Error revoking URL:', e)
    }
  })
  localMediaFiles.value.clear()
}

onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  checkSystemTheme()
  mediaQuery.addEventListener('change', checkSystemTheme)
  
  nextTick(() => {
    const fileInput = document.querySelector('.md-editor-upload-input')
    if (fileInput) fileInput.setAttribute('accept', 'image/*,audio/*')
  })
  
  registerBackButton()
})

onUnmounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.removeEventListener('change', checkSystemTheme)
  unregisterBackButton()
  cleanupBlobUrls()
})

// ⭐ ИЗМЕНЕНО: modelValue → show
watch(() => props.show, (isOpen) => {
  if (isOpen && Capacitor.isNativePlatform()) {
    unregisterBackButton()
    registerBackButton()
  }
})

const onUploadFile = async (files, callback) => {
  const allowedFiles = Array.from(files).filter(f => 
    f.type.startsWith('image/') || f.type.startsWith('audio/')
  )
  if (!allowedFiles.length) return

  const results = allowedFiles.map(file => {
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const url = URL.createObjectURL(file)
    
    localMediaFiles.value.set(filename, { url, file })
    
    return {
      type: file.type,
      url,
      filename,
      isImage: file.type.startsWith('image/')
    }
  })

  const imgs = results.filter(r => r.isImage).map(r => r.url)
  if (imgs.length > 0 && typeof callback === 'function') {
    callback(imgs)
  }

  results.filter(r => !r.isImage).forEach(m => {
    localContent.value += `\n\n<audio controls src="${m.url}"></audio>\n\n`
  })
}

const getDateKey = (date) => {
  if (!date) return new Date().toISOString().split('T')[0]
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

  const saveNote = async () => {

    try {
      // 1. Подготовка маркдауна и ассетов (код остается прежним)
      let markdownToPack = localContent.value || ""
      const cleanAssetsMap = new Map()
      for (const [name, entry] of localMediaFiles.value.entries()) {
        const rawEntry = toRaw(entry)
        if (rawEntry && rawEntry.file) cleanAssetsMap.set(name, toRaw(rawEntry.file))
        else if (rawEntry instanceof Blob) cleanAssetsMap.set(name, rawEntry)
        if (rawEntry && rawEntry.url) markdownToPack = markdownToPack.replaceAll(rawEntry.url, `assets/${name}`)
      }
      
      const docToPack = new InteractiveDoc({ markdown: markdownToPack, assets: cleanAssetsMap })
      
      // 2. Генерируем ID и плоское имя для парсинга
      const noteId = props.note?.id || crypto.randomUUID()
      const year = props.selectedDate.getFullYear();
      const month = String(props.selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(props.selectedDate.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      const initialFilename = `${dateKey}-${noteId}.idoc`

      // Временный объект Note для упаковщика (updated_at должен быть синхронным)
      const tempNote = new Note({
        id: noteId,
        title: localTitle.value,
        filenameLink: initialFilename,
        created_at: props.note?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const zipBlob = await ZipPacker.pack(tempNote, docToPack)
      
      const realPartitionedPath = await LocalDB.saveFile(initialFilename, zipBlob)
      
      const noteData = new Note({
        id: noteId,
        title: localTitle.value,
        filenameLink: realPartitionedPath,
        created_at: tempNote.created_at,
        updated_at: tempNote.updated_at
      })

      syncStore.addToQueue(noteData)
      emit('saved', noteData)
      closeModal() 
      
    } catch (error) {
      technicalStore.status = 'error';
      console.error("Критический сбой функции saveNote:", error); 
      alert(t('NewNote.save_error'))
    } finally {
      technicalStore.status = 'success';
    }
  }

const deleteNote = async () => {
  if (!props.note?.id) return
  if (!confirm(t('NewNote.delete_confirm'))) return
  if (isLoadingBtnClicked.value) return
  
  isLoadingBtnClicked.value = true
  
  try {
    const dateKey = getDateKey(props.selectedDate)
    
    const filename = `${dateKey}-${props.note.id}.idoc`
    await LocalDB.deleteFile(filename)
    
    closeModal()  // ⭐ ИЗМЕНЕНО
    emit('deleted', props.note.id)
    
  } catch (e) {
    console.error("Delete error:", e)
    alert(t('NewNote.delete_error'))
  } finally {
    isLoadingBtnClicked.value = false
  }
}

const loadNoteForEditing = async (note) => {
  technicalStore.status = 'success'; 

  try {
    localTitle.value = note.title || ''
    if (note.filenameLink) {
      const fullPath = note.filenameLink;
      const fileBlob = await LocalDB.getFile(fullPath);
      
      if (!fileBlob) {
        throw new Error("Файл заметки не найден");
      }

      const unpackedDoc = await ZipPacker.unpack(fileBlob);
      
      if (unpackedDoc.note && unpackedDoc.note.title) {
        localTitle.value = unpackedDoc.note.title;
      }
      
      localContent.value = unpackedDoc.doc?.markdown || '';
    } else {
      localContent.value = ''
      localTitle.value = ''
    }
  } catch (e) {
    console.error('Error loading note:', e)
    localContent.value = ''
    alert(t('NewNote.load_error'))
  }
}

const checkSystemTheme = () => {
  editorTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

watch(() => [props.show, props.note], async ([isOpen, note]) => {
  if (isOpen) {
    if (props.isEditing && note) {
      await loadNoteForEditing(note)
    } else {
      localTitle.value = ''
      localContent.value = ''
      isDirty.value = false
      cleanupBlobUrls()
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* Use existing CSS variables without duplication */
.note-editor {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 800px;
  height: 90vh; 
  margin: 2rem 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
  position: relative;
}

.note-md-editor {
  flex: 1; /* Теперь он растет и заполняет пустоту */
  width: 100%;
  display: flex;
  border-radius: 16px;
  flex-direction: column;
  min-height: 0;
}

.note-md-editor:deep(.md-editor-fullscreen) {
  z-index: 7;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
}

.note-md-editor:deep(.md-editor-fullscreen) .md-editor-content {
  background-color: var(--input-bg) !important;
}

.note-md-editor:deep(.md-editor-fullscreen) .cm-editor,
.note-md-editor:deep(.md-editor-fullscreen) .cm-scroller,
.note-md-editor:deep(.md-editor-fullscreen) .cm-content {
  max-width: 800px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  background-color: var(--input-bg) !important;
}

.note-md-editor:deep(.md-editor-fullscreen) .md-editor-preview {
  max-width: 800px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  background-color: var(--input-bg) !important;
  width: 100% !important;
}

.note-md-editor:deep(.md-editor-fullscreen) .md-editor {
  background-color: var(--input-bg) !important;
}

.note-md-editor :deep(.md-editor) {
  --md-bk-color: var(--input-bg) !important;
  --md-color: var(--text-primary) !important;
  --md-border-color: var(--border-color) !important;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  background-color: var(--input-bg) !important;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.note-md-editor :deep(.md-dark) {
  --md-bk-color: var(--input-bg) !important;
  --md-color: var(--text-primary) !important;
}

.note-md-editor :deep(.md-editor-content) {
  flex: 1;
  background-color: var(--input-bg) !important; 
  min-height: 0;
}

.note-md-editor :deep(.md-editor-preview),
.note-md-editor :deep(.md-editor-input) {
  background-color: var(--input-bg) !important; 
  color: var(--text-primary) !important; 
}

.note-md-editor :deep(.md-editor-toolbar) {
  display: flex;
  justify-content: center;  
  margin: 0 4px;
  padding: 10px 5px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.note-md-editor :deep(.md-editor-icon) {
  width: 28px !important;  /* Было около 20px */
  height: 28px !important;
  color: var(--text-secondary);
}

.note-md-editor :deep(.md-editor-icon:hover) {
  color: var(--text-primary);
}


.note-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  z-index: 4;
  background: transparent;
  backdrop-filter: blur(2px);
  padding: 0; /* ← уберите padding здесь */
  box-sizing: border-box;
}

.editor-area {
  flex: 1; 
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-height: 0; /* Важно для корректного flex-скролла */
}

.note-title-input{
  width: 100%; 
  max-width: 400px;
  min-width: 0;
  padding: 5px;
  margin: 0 auto 15px auto;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  text-align: center;
  font-size: 16px;
  color: var(--text-primary);
  background-color: var(--input-bg);
  outline: none;
  font-family: inherit;
  resize: none;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-x: hidden;
  overflow-y: auto;
}

.note-editor::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
}

.editor-header {
  position: relative;        /* БАЗА: Чтобы абсолютная кнопка позиционировалась относительно шапки */
  display: flex;             /* ИЗМЕНЕНО: flex вместо grid для идеального выравнивания по центру */
  justify-content: center;   
  align-items: center;       
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  min-height: 50px;          /* Фиксируем высоту шапки для стабильности */
}

.editor-title {
  grid-column: 2;
  flex: 1; 
  text-align: center; 
  color: var(--heading-color);
  font-size: 1.5rem; 
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar {
  display: flex;
  padding: 12px 16px;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
}

.stdBtn {
  touch-action: manipulation;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.stdBtn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.back-btn {
  position: absolute;       
  right: 20px;   
  z-index: 1;                
  top: 50%;                 
  transform: translateY(-50%); 
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-primary);
  cursor: pointer;
  width: 40px;               /* Чуть уменьшили размер, чтобы крестик смотрелся изящно */
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-secondary);
}

.editor-actions {
  padding: 16px 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #34db74, #2980b9);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #2980b9, #2573a7);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(52, 152, 219, 0.4);
}

.submit-btn:active {
  transform: translateY(0);
}

.delete-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.delete-btn:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
}

/* Выравнивание текста в самом редакторе (область ввода) */
.note-md-editor :deep(.md-editor-input-wrapper),
.note-md-editor :deep(.md-editor-input) {
  background-color: var(--input-bg) !important;
  color: var(--text-primary) !important;
  text-align: left;
}


/* Выравнивание текста в окне предпросмотра (Preview) */
.note-md-editor :deep(.md-editor-preview) {
  text-align: left;
}

/* 🎯 ЦЕНТРИРОВАНИЕ В ПОЛНОЭКРАННОМ РЕЖИМЕ */

/* Ограничиваем и центрируем рабочую область редактора */
.note-md-editor.md-editor-fullscreen :deep(.md-editor-content) {
  /* Контейнер оставляем на всю ширину, чтобы фон оставался сплошным */
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* Центрируем само текстовое поле CodeMirror внутри экрана */
.note-md-editor.md-editor-fullscreen :deep(.cm-editor) {
  max-width: 800px !important;    /* Фиксируем ширину листа */
  margin-left: auto !important;   /* Выравниваем по центру */
  margin-right: auto !important;  /* Выравниваем по центру */
  width: 100% !important;
  background-color: var(--input-bg) !important;
}

/* Настраиваем аналогичное центрирование для панели превью */
.note-md-editor.md-editor-fullscreen :deep(.md-editor-preview) {
  max-width: 800px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  background-color: var(--input-bg) !important;
  width: 100% !important;
}

/* Гарантируем, что скролл-контейнеры не будут сжиматься или ломать верстку */
.note-md-editor.md-editor-fullscreen :deep(.cm-scroller) {
  background-color: var(--input-bg) !important;
  display: block !important; /* Возвращаем стандартное блочное поведение */
}

.note-md-editor.md-editor-fullscreen :deep(.cm-content) {
  width: 100% !important;
  max-width: 100% !important;
}

/* Переопределение внутренних цветов MdEditor под твою тему */
.dark-theme .note-md-editor :deep(.md-editor) {
  --md-bk-color: var(--input-bg);
  --md-color: var(--text-primary);
  --md-border-color: var(--border-color);
}

.dark-theme .note-md-editor :deep(.md-editor-toolbar-wrapper) {
  background-color: var(--bg-secondary);
}

/* Стили для выпадающих меню и модалок внутри редактора в темной теме */
.dark-theme .note-md-editor :deep(.md-editor-dropdown),
.dark-theme .note-md-editor :deep(.md-editor-modal) {
  background-color: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.dark-theme :deep(.md-editor-modal-container) {
  background-color: var(--card-bg) !important;
  color: var(--text-primary) !important;
}

.dark-theme :deep(.md-editor-toolbar-wrapper) {
  background-color: var(--bg-secondary) !important;
}

/* Подсветка активных кнопок в тулбаре */
.dark-theme .note-md-editor :deep(.md-editor-toolbar-item:hover) {
  background-color: var(--bg-primary);
}

/* Фикс для футера редактора (где счетчик слов) */
.dark-theme .note-md-editor :deep(.md-editor-footer) {
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 900px) {
  .note-editor {
    border-radius: 12px;
    height: 95vh; /* На мобилках лучше занять чуть больше высоты */
    margin: 10px;  /* Уменьшаем внешние поля, чтобы было больше места */
  }
  
  /* Уменьшаем высоту самого редактора, чтобы влезли кнопки снизу */
  /* .note-md-editor {
    height: 522px; 
  } */

  .editor-header h1 {
    font-size: 1.5rem;
  }
  
  /* Уменьшаем боковые отступы, чтобы редактор не был слишком узким */
  .editor-area {
    padding: 10px 12px 0 12px;
  }
  
  .toolbar {
    padding: 10px 12px;
  }
  
  .stdBtn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
}

/* --- АДАПТИВНОСТЬ --- */
@media (max-width: 600px) {
  .note-editor {
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 0;
  }

  .editor-header {
    padding: 10px;
    grid-template-columns: 50px 1fr 50px;
  }

  .editor-title {
    font-size: 1.1rem;
  }

  .editor-area {
    padding: 12px;
  }

  .editor-actions {
    flex-direction: column;
    padding: 12px;
  }
}

</style>