// --- Утилиты очистки текста заметки ---
export const stripMarkdown = (str: string) => {
  if (!str) return ''
  return str
    .replace(/!\[(.*?)\]\((.*?)\)/g, ' 🖼️ ')
    .replace(/```[\s\S]*?```/g, ' 💻 ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ➗ ')
    .replace(/\$[^\$]*?\$/g, ' ➗ ')
    .replace(/<audio[\s\S]*?>(?:[\s\S]*?<\/audio>)?/gi, ' 🎧 ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1 🔗')
    .replace(/^[#\s>]+|[*_`~]/gm, '')
    .replace(/^-{3,}|^\*{3,}|^_{3,}/gm, ' ➖ ')
    .replace(/\s+/g, ' ')
    .trim()
}