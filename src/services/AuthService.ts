// services/AuthService.ts
import { AuthFactory } from "@/services/AuthFactory"
import { useTechnicalStore } from "@/services/TechnicalStore"
import { useSyncStore } from "@/services/SyncStore"
import { useRouter } from "vue-router"

export function useAuthService() {
  const technicalStore = useTechnicalStore()
  const syncStore = useSyncStore()
  const router = useRouter()

  const logout = async () => {
    try {
      syncStore.stopSyncLogout()

      const provider = AuthFactory.getProvider(technicalStore.currentProviderId!)
      if (provider?.setOnAuthRequired) {
        provider.setOnAuthRequired(() => {})
      }

      localStorage.removeItem('access_token')
      localStorage.removeItem('token_expiry')

      technicalStore.clearAuth()
      await router.push('/login')
    } catch {
      window.location.href = '/login'
    }
  }

  return { logout }
}