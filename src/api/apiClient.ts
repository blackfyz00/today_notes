// src/api/apiClient.ts
import router from '@/router';

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Добавляем токен только если он есть
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Автоматически ставим JSON, если отправляем объект
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${baseUrl}${url}`, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem('token');
      router.push('/auth'); 
      throw new Error('Сессия истекла');
    }

    return response;
  } catch (error) {
    throw error;
  }
};
