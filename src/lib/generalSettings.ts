import { supabase } from './supabase'

export type GeneralSettings = {
  business_name: string
  support_email: string
  support_phone: string
  business_address: string
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  business_name: 'SonicRing',
  support_email: 'support@bosslabai.com',
  support_phone: '',
  business_address: '',
}

const SETTINGS_KEY = 'general'

function mergeSettings(raw: unknown): GeneralSettings {
  const value = (raw ?? {}) as Partial<GeneralSettings>
  return { ...DEFAULT_GENERAL_SETTINGS, ...value }
}

export async function loadGeneralSettings(): Promise<GeneralSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()

  if (error || !data) {
    return DEFAULT_GENERAL_SETTINGS
  }

  return mergeSettings(data.value)
}

export async function saveGeneralSettings(
  settings: GeneralSettings,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('site_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) {
    return { error: error.message || 'Could not save settings.' }
  }

  return { error: null }
}
