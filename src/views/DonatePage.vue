<template>
  <div class="support-page">
    <header class="page-header">
      <h1>{{ t('Donate.title') }}</h1>
      <p class="subtitle">{{ t('Donate.subtitle') }}</p>
    </header>

    <div class="support-container">
      <!-- Способы поддержки -->
      <div class="support-cards">
        <!-- Boosty -->
        <div class="support-card">
          <div class="card-icon">🚀</div>
          <h3>Boosty</h3>
          <p>{{ t('Donate.boostyDesc') }}</p>
          <button class="support-btn boosty" @click="openLink('https://boosty.to/your-username')">
            {{ t('Donate.support') }}
          </button>
        </div>

        <!-- Patreon -->
        <div class="support-card">
          <div class="card-icon">🎨</div>
          <h3>Patreon</h3>
          <p>{{ t('Donate.patreonDesc') }}</p>
          <button class="support-btn patreon" @click="openLink('https://patreon.com/your-username')">
            {{ t('Donate.support') }}
          </button>
        </div>

        <!-- DonationAlerts -->
        <div class="support-card">
          <div class="card-icon">💜</div>
          <h3>DonationAlerts</h3>
          <p>{{ t('Donate.donationalertsDesc') }}</p>
          <button class="support-btn donationalerts" @click="openLink('https://www.donationalerts.com/r/your-username')">
            {{ t('Donate.support') }}
          </button>
        </div>

        <!-- Ko-fi -->
        <div class="support-card">
          <div class="card-icon">☕</div>
          <h3>Ko-fi</h3>
          <p>{{ t('Donate.kofiDesc') }}</p>
          <button class="support-btn kofi" @click="openLink('https://ko-fi.com/your-username')">
            {{ t('Donate.support') }}
          </button>
        </div>
      </div>

      <!-- Контакты -->
      <div class="contacts-section">
        <h2>{{ t('Donate.contacts') }}</h2>
        <div class="contacts-grid">
          <div class="contact-item" @click="openLink('https://t.me/your-username')">
            <div class="contact-icon">📱</div>
            <span>Telegram</span>
          </div>
          <div class="contact-item" @click="openLink('mailto:your@email.com')">
            <div class="contact-icon">✉️</div>
            <span>{{ t('Donate.email') }}</span>
          </div>
          <div class="contact-item" @click="openLink('https://github.com/your-username')">
            <div class="contact-icon">🐙</div>
            <span>GitHub</span>
          </div>
          <div class="contact-item" @click="openLink('https://discord.gg/your-invite')">
            <div class="contact-icon">💬</div>
            <span>Discord</span>
          </div>
        </div>
      </div>

      <!-- Благодарности -->
      <div class="thanks-section">
        <div class="thanks-card">
          <div class="thanks-icon">❤️</div>
          <h3>{{ t('Donate.thanks') }}</h3>
          <p>{{ t('Donate.thanksDesc') }}</p>
        </div>
      </div>

      <!-- Версия приложения -->
      <div class="version-info">
        <p class="copyright">© {{yearReserved}} Bright Today</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {computed} from 'vue'

const { t } = useI18n();
const yearReserved = computed(() => {
  return new Date().getFullYear();
});

const openLink = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    // На мобильных платформах открываем в браузере
    await Browser.open({ url });
  } else {
    // В вебе открываем в новой вкладке
    window.open(url, '_blank');
  }
};
</script>

<style scoped>
.support-page {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: 50px;
  margin-top: 20px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.subtitle {
  margin: 0 auto;
  font-size: 1.1rem;
  color: var(--text-secondary, #a0a0a0);
}

.support-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 50px;
}

.support-card {
  background: var(--card-bg, #1a1a2e);
  border-radius: 20px;
  padding: 30px 20px;
  text-align: center;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  cursor: pointer;
}

.support-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.support-card h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: var(--text-primary, #ffffff);
}

.support-card p {
  font-size: 0.9rem;
  color: var(--text-secondary, #a0a0a0);
  margin-bottom: 20px;
  line-height: 1.5;
}

.support-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.support-btn.boosty {
  background: linear-gradient(135deg, #f59e0b, #f97316);
}

.support-btn.patreon {
  background: linear-gradient(135deg, #ff424d, #ff6b6b);
}

.support-btn.donationalerts {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.support-btn.kofi {
  background: linear-gradient(135deg, #13c3c3, #0f9e9e);
}

.support-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.support-btn:active {
  transform: scale(0.98);
}

/* Контакты */
.contacts-section {
  margin-bottom: 50px;
}

.contacts-section h2 {
  text-align: center;
  font-size: 1.8rem;
  margin-bottom: 30px;
  color: var(--text-primary, #ffffff);
}

.contacts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.contact-item {
  background: var(--card-bg, #1a1a2e);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.contact-item:hover {
  transform: translateY(-3px);
  background: linear-gradient(135deg, #3498db20, #2ecc7120);
  border-color: #3498db;
}

.contact-icon {
  font-size: 24px;
}

.contact-item span {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
}

/* Благодарности */
.thanks-section {
  margin-bottom: 40px;
}

.thanks-card {
  background: linear-gradient(135deg, #3498db20, #2ecc7120);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.thanks-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.thanks-card h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: var(--text-primary, #ffffff);
}

.thanks-card p {
  font-size: 1rem;
  color: var(--text-secondary, #a0a0a0);
  line-height: 1.5;
  max-width: 600px;
  margin: 0 auto;
}

/* Версия */
.version-info {
  text-align: center;
  color: var(--text-secondary, #a0a0a0);
  font-size: 0.8rem;
  padding: 20px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;  /* Выравнивание по центру */
}

.version-info p {
  margin: 5px 0;  /* или margin: 0 */
}

.copyright {
  margin: 5px auto 0;
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Адаптивность */
@media (max-width: 768px) {
  .page-header {
    margin-top: 110px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .support-cards {
    grid-template-columns: 1fr;
  }
  
  .contacts-grid {
    grid-template-columns: 1fr;
  }
  
  .thanks-card {
    padding: 30px 20px;
  }
  
  .thanks-card p {
    font-size: 0.9rem;
  }
}
</style>