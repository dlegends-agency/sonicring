import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

/** True when Supabase env vars are set; otherwise the database is disabled. */
export const isDatabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey)

const DISABLED_RESULT = {
  data: null,
  error: { message: 'Database is disabled', code: 'DB_DISABLED' },
  count: null,
  status: 503,
  statusText: 'Database is disabled',
}

/**
 * Stand-in client used when Supabase isn't configured. Any chain of calls
 * (e.g. `supabase.from('x').select().eq(...)`, `supabase.functions.invoke`)
 * resolves to `{ data: null, error }` instead of crashing the site.
 */
function createDisabledClient(): SupabaseClient {
  const handler: ProxyHandler<() => void> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: typeof DISABLED_RESULT) => unknown) =>
          resolve(DISABLED_RESULT)
      }
      return chain
    },
    apply() {
      return chain
    },
  }
  const chain: unknown = new Proxy(() => {}, handler)
  return chain as SupabaseClient
}

if (!isDatabaseEnabled) {
  console.warn(
    'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY); database features are disabled.',
  )
}

export type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  status: 'subscribed' | 'unsubscribed' | 'bounced'
  order_plan: string | null
  total_revenue: number
  notes: string
  timezone: string
  address: string
  company: string
  gender: string
  date_of_birth: string
  business_niche: string
  business_goal: string
  business_website: string
  business_location: string
  business_goals: string[]
  onboarding_step: number
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export type List = {
  id: string
  name: string
  created_at: string
}

export type Tag = {
  id: string
  name: string
  created_at: string
}

export type ContactList = {
  contact_id: string
  list_id: string
  created_at: string
  lists?: List
}

export type ContactTag = {
  contact_id: string
  tag_id: string
  created_at: string
  tags?: Tag
}

export type AutomationStatus = 'active' | 'inactive'
export type AutomationTrigger =
  | 'unset'
  | 'form_submit'
  | 'stripe_purchase'
  | 'order_created'
  | 'order_created_per_product'
  | 'tag_added'
  | 'tag_removed'
  | 'added_to_list'
  | 'removed_from_list'
  | 'contact_subscribes'
  | 'contact_unsubscribes'
  | 'webhook_received'

export type ActionType =
  | 'add_to_list'
  | 'remove_from_list'
  | 'add_tag'
  | 'remove_tag'
  | 'zapier_webhook'
  | 'send_email'

export type OrderContainsMode = 'any' | 'specific'

export type OrderRunFrequency = 'once' | 'multiple'

export type OrderStatusOption =
  | 'completed'
  | 'draft'
  | 'on_hold'
  | 'processing'

export type EntityContainsMode = 'any' | 'specific'

export type ConditionField =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'company'
  | 'status'
  | 'business_niche'
  | 'order_plan'
  | 'total_revenue'
  | 'onboarded_at'
  | 'has_tag'
  | 'has_list'

export type ConditionOperator =
  | 'is_set'
  | 'is_empty'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'has'
  | 'not_has'

export type ConditionRule = {
  field: ConditionField
  operator: ConditionOperator
  value?: string
}

export type ConditionMatchMode = 'all' | 'any'

export type AutomationTriggerConfig = {
  order_statuses?: OrderStatusOption[]
  order_contains?: OrderContainsMode
  product_ids?: string[]
  run_frequency?: OrderRunFrequency
  webhook_key?: string
  last_received_at?: string
  last_payload?: Record<string, unknown> | null
  entity_contains?: EntityContainsMode
  tag_ids?: string[]
  list_ids?: string[]
}

export type Automation = {
  id: string
  name: string
  trigger_type: AutomationTrigger
  trigger_config: AutomationTriggerConfig
  status: AutomationStatus
  created_at: string
  updated_at: string
}

export type AutomationStepType =
  | 'action'
  | 'delay'
  | 'condition'
  | 'split_path'
  | 'goal'
  | 'jump'
  | 'exit'

export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks'

export type AutomationStep = {
  id: string
  automation_id: string
  position: number
  step_type: AutomationStepType
  action_type: ActionType | null
  config: {
    list_id?: string
    tag_id?: string
    webhook_url?: string
    email_subject?: string
    email_body?: string
    delay_days?: number
    delay_mode?: 'period' | 'datetime' | 'custom_field'
    delay_amount?: number
    delay_unit?: DelayUnit
    delay_until_time?: boolean
    delay_until_time_value?: string
    delay_until_weekday?: boolean
    delay_until_weekdays?: number[]
    delay_datetime?: string
    delay_custom_field?: string
    condition_category?: string
    condition_label?: string
    condition_categories?: string[]
    condition_rules?: ConditionRule[]
    condition_match?: ConditionMatchMode
    goal_name?: string
    jump_to_position?: number
    split_percent?: number
    exit_reason?: string
  }
  created_at: string
}

export type AutomationRun = {
  id: string
  automation_id: string
  contact_id: string
  status: 'running' | 'waiting' | 'completed' | 'failed'
  current_step: number
  resume_at: string | null
  started_at: string
  finished_at: string | null
}

/** @deprecated Use Contact */
export type Lead = Contact

export const supabase: SupabaseClient = isDatabaseEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createDisabledClient()
