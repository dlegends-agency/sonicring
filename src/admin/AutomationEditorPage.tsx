import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ACTION_CATEGORIES,
  ACTION_LABELS,
  ACTION_OPTIONS,
  EVENT_CATEGORIES,
  EVENT_OPTIONS,
  ORDER_STATUS_OPTIONS,
  TRIGGER_LABELS,
  buildAutomationWebhookUrl,
  defaultCrmEntityTriggerConfig,
  defaultOrderTriggerConfig,
  defaultWebhookTriggerConfig,
  describeCrmEntityTriggerConfig,
  describeOrderTriggerConfig,
  describeWebhookTriggerConfig,
  getEventOption,
  isCrmEntityTrigger,
  isOrderTrigger,
  isTagTrigger,
  isWebhookTrigger,
  type ActionCategoryId,
  type EventCategoryId,
  type TriggerEventId,
} from './automationCatalog'
import { AutomationInsightsPanels } from './AutomationInsightsPanels'
import { checkoutPlans } from '../data/checkoutPlans'
import {
  supabase,
  type ActionType,
  type Automation,
  type AutomationStep,
  type AutomationStepType,
  type AutomationTriggerConfig,
  type ConditionField,
  type ConditionMatchMode,
  type ConditionOperator,
  type ConditionRule,
  type DelayUnit,
  type List,
  type OrderContainsMode,
  type OrderRunFrequency,
  type OrderStatusOption,
  type Tag,
} from '../lib/supabase'

type ModalKind =
  | 'event'
  | 'orderConfig'
  | 'webhookConfig'
  | 'crmConfig'
  | 'addStep'
  | 'action'
  | 'delayConfig'
  | 'conditionConfig'
  | 'stepConfig'
  | null

type DelayDraft = {
  mode: 'period' | 'datetime' | 'custom_field'
  amount: number
  unit: DelayUnit
  untilTime: boolean
  untilTimeValue: string
  untilWeekday: boolean
  untilWeekdays: number[]
  datetime: string
  customField: string
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

type ConditionDraft = {
  rules: ConditionRule[]
  matchMode: ConditionMatchMode
  legacyCategories: string[]
}

type StepDraft = {
  type: 'goal' | 'jump' | 'split_path' | 'exit'
  goalName: string
  jumpToPosition: number
  splitPercent: number
  exitReason: string
}

const ADD_STEP_OPTIONS: {
  id: AutomationStepType
  label: string
  icon: string
  iconClass: string
}[] = [
  { id: 'action', label: 'Action', icon: '⚡', iconClass: 'is-action' },
  { id: 'delay', label: 'Delay', icon: '⏱', iconClass: 'is-delay' },
  { id: 'condition', label: 'Condition', icon: '⎇', iconClass: 'is-condition' },
  { id: 'split_path', label: 'Split Path', icon: '⑂', iconClass: 'is-split' },
  { id: 'goal', label: 'Goal', icon: '◎', iconClass: 'is-goal' },
  { id: 'jump', label: 'Jump', icon: '↝', iconClass: 'is-jump' },
  { id: 'exit', label: 'Exit', icon: '⇨', iconClass: 'is-exit' },
]

const CONDITION_FIELD_OPTIONS: { id: ConditionField; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'first_name', label: 'First Name' },
  { id: 'last_name', label: 'Last Name' },
  { id: 'phone', label: 'Phone' },
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Subscription Status' },
  { id: 'business_niche', label: 'Business Niche' },
  { id: 'order_plan', label: 'Order Plan' },
  { id: 'total_revenue', label: 'Total Revenue' },
  { id: 'onboarded_at', label: 'Onboarded Date' },
  { id: 'has_tag', label: 'Has Tag' },
  { id: 'has_list', label: 'Is In List' },
]

const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  is_set: 'Is set',
  is_empty: 'Is empty',
  equals: 'Equals',
  not_equals: 'Does not equal',
  contains: 'Contains',
  not_contains: 'Does not contain',
  greater_than: 'Greater than',
  less_than: 'Less than',
  has: 'Has',
  not_has: 'Does not have',
}

function operatorsForConditionField(field: ConditionField): ConditionOperator[] {
  if (field === 'has_tag' || field === 'has_list') return ['has', 'not_has']
  if (field === 'total_revenue') {
    return ['is_set', 'is_empty', 'equals', 'not_equals', 'greater_than', 'less_than']
  }
  return ['is_set', 'is_empty', 'equals', 'not_equals', 'contains', 'not_contains']
}

function conditionRuleNeedsValue(operator: ConditionOperator) {
  return operator !== 'is_set' && operator !== 'is_empty'
}

function fieldLabel(field: ConditionField) {
  return CONDITION_FIELD_OPTIONS.find((option) => option.id === field)?.label ?? field
}

function describeConditionRule(rule: ConditionRule, lists: List[], tags: Tag[]) {
  const label = fieldLabel(rule.field)
  const opLabel = CONDITION_OPERATOR_LABELS[rule.operator]
  if (!conditionRuleNeedsValue(rule.operator)) return `${label} ${opLabel.toLowerCase()}`
  if (rule.field === 'has_tag') {
    const tagName = tags.find((tag) => tag.id === rule.value)?.name ?? rule.value ?? ''
    return `Tag ${rule.operator === 'not_has' ? 'does not include' : 'includes'} "${tagName}"`
  }
  if (rule.field === 'has_list') {
    const listName = lists.find((list) => list.id === rule.value)?.name ?? rule.value ?? ''
    return `List ${rule.operator === 'not_has' ? 'does not include' : 'includes'} "${listName}"`
  }
  return `${label} ${opLabel.toLowerCase()} "${rule.value ?? ''}"`
}

function describeConditionRules(
  rules: ConditionRule[],
  matchMode: ConditionMatchMode,
  lists: List[],
  tags: Tag[],
) {
  return rules
    .map((rule) => describeConditionRule(rule, lists, tags))
    .join(matchMode === 'any' ? ' OR ' : ' AND ')
}

function conditionRuleIsValid(rule: ConditionRule) {
  if (!rule.field || !rule.operator) return false
  if (!conditionRuleNeedsValue(rule.operator)) return true
  return Boolean(rule.value && rule.value.trim())
}

const defaultDelayDraft = (): DelayDraft => ({
  mode: 'period',
  amount: 1,
  unit: 'days',
  untilTime: false,
  untilTimeValue: '09:00',
  untilWeekday: false,
  untilWeekdays: [],
  datetime: '',
  customField: '',
})

const defaultConditionDraft = (): ConditionDraft => ({
  rules: [],
  matchMode: 'all',
  legacyCategories: [],
})

const defaultConditionRule = (): ConditionRule => ({
  field: 'email',
  operator: 'is_set',
})

const defaultStepDraft = (type: StepDraft['type']): StepDraft => ({
  type,
  goalName: 'Primary Goal',
  jumpToPosition: 0,
  splitPercent: 50,
  exitReason: 'Exit automation',
})

function delaySummary(draft: DelayDraft) {
  const singular = draft.unit.replace(/s$/, '')
  const unitWord =
    draft.amount === 1
      ? singular.charAt(0).toUpperCase() + singular.slice(1)
      : draft.unit.charAt(0).toUpperCase() + draft.unit.slice(1)
  return `Delay of ${draft.amount} ${unitWord}.`
}

function toDelayDays(amount: number, unit: DelayUnit) {
  if (unit === 'weeks') return Math.max(1, Math.ceil(amount * 7))
  if (unit === 'days') return Math.max(1, Math.ceil(amount || 1))
  if (unit === 'hours') return Math.max(1, Math.ceil(amount / 24) || 1)
  return Math.max(1, Math.ceil(amount / (24 * 60)) || 1)
}

function stepTypeLabel(type: AutomationStepType) {
  return ADD_STEP_OPTIONS.find((option) => option.id === type)?.label ?? type
}

type BuilderTab =
  | 'workflow'
  | 'contacts'
  | 'analytics'
  | 'engagements'
  | 'orders'

const SIDEBAR_TABS: { id: BuilderTab; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'engagements', label: 'Engagements' },
  { id: 'orders', label: 'Orders' },
]

export function AutomationEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [steps, setSteps] = useState<AutomationStep[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<BuilderTab>('workflow')
  const [statusSaving, setStatusSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [eventCategory, setEventCategory] = useState<EventCategoryId>('crm')
  const [actionCategory, setActionCategory] =
    useState<ActionCategoryId>('messaging')
  const [pendingEvent, setPendingEvent] = useState<TriggerEventId | null>(
    null,
  )
  const [pendingOrderConfig, setPendingOrderConfig] =
    useState<AutomationTriggerConfig>(defaultOrderTriggerConfig(null))
  const [pendingWebhookConfig, setPendingWebhookConfig] =
    useState<AutomationTriggerConfig>(defaultWebhookTriggerConfig())
  const [pendingCrmConfig, setPendingCrmConfig] =
    useState<AutomationTriggerConfig>(defaultCrmEntityTriggerConfig())
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null)
  const [pendingDelay, setPendingDelay] = useState<DelayDraft>(defaultDelayDraft())
  const [pendingCondition, setPendingCondition] = useState<ConditionDraft>(
    defaultConditionDraft(),
  )
  const [pendingStep, setPendingStep] = useState<StepDraft>(
    defaultStepDraft('goal'),
  )
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [eventQuery, setEventQuery] = useState('')
  const [actionQuery, setActionQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')

    const [
      { data: automationData, error: automationError },
      { data: stepsData },
      { data: listsData },
      { data: tagsData },
    ] = await Promise.all([
      supabase.from('automations').select('*').eq('id', id).single(),
      supabase
        .from('automation_steps')
        .select('*')
        .eq('automation_id', id)
        .order('position', { ascending: true }),
      supabase.from('lists').select('*').order('name'),
      supabase.from('tags').select('*').order('name'),
    ])

    if (automationError || !automationData) {
      setError('Automation not found.')
      setLoading(false)
      return
    }

    setAutomation({
      ...(automationData as Automation),
      trigger_config:
        ((automationData as Automation).trigger_config as AutomationTriggerConfig) ??
        {},
    })
    setSteps((stepsData as AutomationStep[]) ?? [])
    setLists((listsData as List[]) ?? [])
    setTags((tagsData as Tag[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [id])

  const selectedEvent = getEventOption(automation?.trigger_type)
  const hasTrigger =
    automation?.trigger_type && automation.trigger_type !== 'unset'

  const filteredEvents = useMemo(() => {
    const q = eventQuery.trim().toLowerCase()
    return EVENT_OPTIONS.filter(
      (event) =>
        event.category === eventCategory &&
        (!q ||
          event.label.toLowerCase().includes(q) ||
          event.group.toLowerCase().includes(q)),
    )
  }, [eventCategory, eventQuery])

  const eventGroups = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>()
    for (const event of filteredEvents) {
      const list = map.get(event.group) ?? []
      list.push(event)
      map.set(event.group, list)
    }
    return [...map.entries()]
  }, [filteredEvents])

  const filteredActions = useMemo(() => {
    const q = actionQuery.trim().toLowerCase()
    return ACTION_OPTIONS.filter(
      (action) =>
        action.category === actionCategory &&
        (!q ||
          action.label.toLowerCase().includes(q) ||
          action.group.toLowerCase().includes(q)),
    )
  }, [actionCategory, actionQuery])

  const actionGroups = useMemo(() => {
    const map = new Map<string, typeof filteredActions>()
    for (const action of filteredActions) {
      const list = map.get(action.group) ?? []
      list.push(action)
      map.set(action.group, list)
    }
    return [...map.entries()]
  }, [filteredActions])

  const toggleActive = async () => {
    if (!automation || statusSaving) return
    if (automation.status !== 'active' && !hasTrigger) {
      setError('Select an event before activating this automation.')
      return
    }
    const next = automation.status === 'active' ? 'inactive' : 'active'
    setStatusSaving(true)
    const { error: updateError } = await supabase
      .from('automations')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', automation.id)
    setStatusSaving(false)
    if (updateError) {
      setError('Could not update automation status.')
      return
    }
    setAutomation({ ...automation, status: next })
    setError('')
  }

  const startEditingName = () => {
    if (!automation) return
    setNameDraft(automation.name)
    setEditingName(true)
  }

  const cancelEditingName = () => {
    setEditingName(false)
    setNameDraft('')
  }

  const saveName = async () => {
    if (!automation) return
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === automation.name) {
      setEditingName(false)
      return
    }
    setNameSaving(true)
    const { error: updateError } = await supabase
      .from('automations')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', automation.id)
    setNameSaving(false)
    if (updateError) {
      setError('Could not rename automation.')
      return
    }
    setAutomation({ ...automation, name: trimmed })
    setEditingName(false)
    setError('')
  }

  const openEventModal = () => {
    const current = automation?.trigger_type
    setPendingEvent(
      current && current !== 'unset' ? (current as TriggerEventId) : null,
    )
    const option = getEventOption(current)
    setEventCategory(option?.category ?? 'crm')
    setEventQuery('')
    setModal('event')
  }

  const openOrderConfig = (triggerId: TriggerEventId) => {
    const existing = automation?.trigger_config
    const defaults = defaultOrderTriggerConfig(triggerId)
    setPendingOrderConfig({
      ...defaults,
      ...(existing ?? {}),
      order_statuses:
        existing?.order_statuses?.length
          ? existing.order_statuses
          : defaults.order_statuses,
      order_contains: existing?.order_contains ?? defaults.order_contains,
      product_ids: existing?.product_ids ?? defaults.product_ids,
      run_frequency: existing?.run_frequency ?? defaults.run_frequency,
    })
    setModal('orderConfig')
  }

  const openWebhookConfig = () => {
    if (!automation) return
    const existing = automation.trigger_config
    const defaults = defaultWebhookTriggerConfig(existing?.webhook_key)
    const draft: AutomationTriggerConfig = {
      ...defaults,
      ...(existing ?? {}),
      webhook_key: existing?.webhook_key || defaults.webhook_key,
      run_frequency: existing?.run_frequency ?? defaults.run_frequency,
      last_received_at: existing?.last_received_at,
      last_payload: existing?.last_payload ?? null,
    }
    setPendingWebhookConfig(draft)
    setPendingEvent('webhook_received')
    setModal('webhookConfig')
  }

  const openCrmConfig = (triggerId: TriggerEventId) => {
    const existing = automation?.trigger_config
    const defaults = defaultCrmEntityTriggerConfig()
    setPendingCrmConfig({
      ...defaults,
      ...(existing ?? {}),
      entity_contains: existing?.entity_contains ?? defaults.entity_contains,
      tag_ids: existing?.tag_ids ?? defaults.tag_ids,
      list_ids: existing?.list_ids ?? defaults.list_ids,
      run_frequency: existing?.run_frequency ?? defaults.run_frequency,
    })
    setPendingEvent(triggerId)
    setModal('crmConfig')
  }

  const saveEvent = async () => {
    if (!automation || !pendingEvent) return
    if (isOrderTrigger(pendingEvent)) {
      openOrderConfig(pendingEvent)
      return
    }
    if (isWebhookTrigger(pendingEvent)) {
      void openWebhookConfig()
      return
    }
    if (isCrmEntityTrigger(pendingEvent)) {
      openCrmConfig(pendingEvent)
      return
    }
    setSaving(true)
    await supabase
      .from('automations')
      .update({
        trigger_type: pendingEvent,
        trigger_config: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id)
    setAutomation({
      ...automation,
      trigger_type: pendingEvent,
      trigger_config: {},
    })
    setModal(null)
    setSaving(false)
  }

  const saveOrderConfig = async () => {
    if (!automation || !pendingEvent) return
    if (
      pendingOrderConfig.order_contains === 'specific' &&
      !(pendingOrderConfig.product_ids?.length)
    ) {
      setError('Select at least one plan/product.')
      return
    }
    if (!(pendingOrderConfig.order_statuses?.length)) {
      setError('Select at least one order status.')
      return
    }
    setSaving(true)
    setError('')
    const config: AutomationTriggerConfig = {
      order_statuses: pendingOrderConfig.order_statuses,
      order_contains: pendingOrderConfig.order_contains ?? 'any',
      product_ids:
        pendingOrderConfig.order_contains === 'specific'
          ? pendingOrderConfig.product_ids ?? []
          : [],
      run_frequency: pendingOrderConfig.run_frequency ?? 'once',
    }
    await supabase
      .from('automations')
      .update({
        trigger_type: pendingEvent,
        trigger_config: config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id)
    setAutomation({
      ...automation,
      trigger_type: pendingEvent,
      trigger_config: config,
    })
    setModal(null)
    setSaving(false)
  }

  const saveWebhookConfig = async () => {
    if (!automation || !pendingEvent) return
    setSaving(true)
    setError('')
    const config: AutomationTriggerConfig = {
      webhook_key:
        pendingWebhookConfig.webhook_key || defaultWebhookTriggerConfig().webhook_key,
      run_frequency: pendingWebhookConfig.run_frequency ?? 'once',
      last_received_at: pendingWebhookConfig.last_received_at,
      last_payload: pendingWebhookConfig.last_payload ?? null,
    }
    await supabase
      .from('automations')
      .update({
        trigger_type: 'webhook_received',
        trigger_config: config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id)
    setAutomation({
      ...automation,
      trigger_type: 'webhook_received',
      trigger_config: config,
    })
    setModal(null)
    setSaving(false)
  }

  const saveCrmConfig = async () => {
    if (!automation || !pendingEvent) return
    const isTag = isTagTrigger(pendingEvent)
    if (
      pendingCrmConfig.entity_contains === 'specific' &&
      !(isTag
        ? pendingCrmConfig.tag_ids?.length
        : pendingCrmConfig.list_ids?.length)
    ) {
      setError(
        isTag
          ? 'Select at least one tag.'
          : 'Select at least one list.',
      )
      return
    }
    setSaving(true)
    setError('')
    const config: AutomationTriggerConfig = {
      entity_contains: pendingCrmConfig.entity_contains ?? 'specific',
      tag_ids: isTag
        ? pendingCrmConfig.entity_contains === 'specific'
          ? pendingCrmConfig.tag_ids ?? []
          : []
        : [],
      list_ids: !isTag
        ? pendingCrmConfig.entity_contains === 'specific'
          ? pendingCrmConfig.list_ids ?? []
          : []
        : [],
      run_frequency: pendingCrmConfig.run_frequency ?? 'once',
    }
    await supabase
      .from('automations')
      .update({
        trigger_type: pendingEvent,
        trigger_config: config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.id)
    setAutomation({
      ...automation,
      trigger_type: pendingEvent,
      trigger_config: config,
    })
    setModal(null)
    setSaving(false)
  }

  const openAddStep = (position: number) => {
    setInsertAt(position)
    setEditingStepId(null)
    setModal('addStep')
  }

  const chooseActionStep = () => {
    setPendingAction(null)
    setActionCategory('messaging')
    setActionQuery('')
    setModal('action')
  }

  const chooseAddStepOption = (type: AutomationStepType) => {
    setEditingStepId(null)
    if (type === 'action') {
      chooseActionStep()
      return
    }
    if (type === 'delay') {
      setPendingDelay(defaultDelayDraft())
      setModal('delayConfig')
      return
    }
    if (type === 'condition') {
      setPendingCondition(defaultConditionDraft())
      setModal('conditionConfig')
      return
    }
    if (
      type === 'goal' ||
      type === 'jump' ||
      type === 'split_path' ||
      type === 'exit'
    ) {
      setPendingStep(defaultStepDraft(type))
      setModal('stepConfig')
      return
    }
  }

  const openEditStep = (step: AutomationStep) => {
    setEditingStepId(step.id)
    setInsertAt(null)
    if (step.step_type === 'delay') {
      setPendingDelay({
        mode: step.config.delay_mode ?? 'period',
        amount: step.config.delay_amount ?? step.config.delay_days ?? 1,
        unit: step.config.delay_unit ?? 'days',
        untilTime: Boolean(step.config.delay_until_time),
        untilTimeValue: step.config.delay_until_time_value ?? '09:00',
        untilWeekday: Boolean(step.config.delay_until_weekday),
        untilWeekdays: step.config.delay_until_weekdays ?? [],
        datetime: step.config.delay_datetime ?? '',
        customField: step.config.delay_custom_field ?? '',
      })
      setModal('delayConfig')
      return
    }
    if (step.step_type === 'condition') {
      if (step.config.condition_rules?.length) {
        setPendingCondition({
          rules: step.config.condition_rules,
          matchMode: step.config.condition_match ?? 'all',
          legacyCategories: [],
        })
      } else {
        const categories =
          step.config.condition_categories?.length
            ? step.config.condition_categories
            : step.config.condition_category
              ? [step.config.condition_category]
              : []
        setPendingCondition({
          rules: [],
          matchMode: 'all',
          legacyCategories: categories,
        })
      }
      setModal('conditionConfig')
      return
    }
    if (
      step.step_type === 'goal' ||
      step.step_type === 'jump' ||
      step.step_type === 'split_path' ||
      step.step_type === 'exit'
    ) {
      setPendingStep({
        type: step.step_type,
        goalName: step.config.goal_name ?? 'Primary Goal',
        jumpToPosition: step.config.jump_to_position ?? 0,
        splitPercent: step.config.split_percent ?? 50,
        exitReason: step.config.exit_reason ?? 'Exit automation',
      })
      setModal('stepConfig')
    }
  }

  const delayConfigFromDraft = (): AutomationStep['config'] => ({
    delay_mode: pendingDelay.mode,
    delay_amount: pendingDelay.amount,
    delay_unit: pendingDelay.unit,
    delay_until_time: pendingDelay.untilTime,
    delay_until_time_value: pendingDelay.untilTime
      ? pendingDelay.untilTimeValue
      : undefined,
    delay_until_weekday: pendingDelay.untilWeekday,
    delay_until_weekdays: pendingDelay.untilWeekday
      ? pendingDelay.untilWeekdays
      : undefined,
    delay_datetime: pendingDelay.datetime || undefined,
    delay_custom_field: pendingDelay.customField || undefined,
    delay_days:
      pendingDelay.mode === 'period'
        ? toDelayDays(pendingDelay.amount, pendingDelay.unit)
        : 1,
  })

  const saveDelayStep = async () => {
    setSaving(true)
    setError('')
    if (editingStepId) {
      const { error: updateError } = await supabase
        .from('automation_steps')
        .update({ config: delayConfigFromDraft() })
        .eq('id', editingStepId)
      if (updateError) {
        setError('Could not update delay step.')
        setSaving(false)
        return
      }
      await load()
      setModal(null)
      setEditingStepId(null)
      setSaving(false)
      return
    }
    if (!id || insertAt === null) {
      setSaving(false)
      return
    }
    await insertStep({
      step_type: 'delay',
      action_type: null,
      config: delayConfigFromDraft(),
      position: insertAt,
    })
    setModal(null)
    setSaving(false)
  }

  const saveConditionStep = async () => {
    const rules = pendingCondition.rules.filter(conditionRuleIsValid)
    if (!rules.length) {
      setError('Add at least one condition rule.')
      return
    }
    setSaving(true)
    setError('')
    const config: AutomationStep['config'] = {
      condition_rules: rules,
      condition_match: pendingCondition.matchMode,
      condition_label: describeConditionRules(
        rules,
        pendingCondition.matchMode,
        lists,
        tags,
      ),
    }
    if (editingStepId) {
      const { error: updateError } = await supabase
        .from('automation_steps')
        .update({ config })
        .eq('id', editingStepId)
      if (updateError) {
        setError('Could not update condition step.')
        setSaving(false)
        return
      }
      await load()
      setModal(null)
      setEditingStepId(null)
      setSaving(false)
      return
    }
    if (!id || insertAt === null) {
      setSaving(false)
      return
    }
    await insertStep({
      step_type: 'condition',
      action_type: null,
      config,
      position: insertAt,
    })
    setModal(null)
    setSaving(false)
  }

  const saveGenericStep = async () => {
    setSaving(true)
    setError('')
    const config: AutomationStep['config'] =
      pendingStep.type === 'goal'
        ? { goal_name: pendingStep.goalName.trim() || 'Primary Goal' }
        : pendingStep.type === 'jump'
          ? { jump_to_position: pendingStep.jumpToPosition }
          : pendingStep.type === 'split_path'
            ? { split_percent: pendingStep.splitPercent }
            : { exit_reason: pendingStep.exitReason.trim() || 'Exit automation' }

    if (editingStepId) {
      const { error: updateError } = await supabase
        .from('automation_steps')
        .update({ config })
        .eq('id', editingStepId)
      if (updateError) {
        setError('Could not update step.')
        setSaving(false)
        return
      }
      await load()
      setModal(null)
      setEditingStepId(null)
      setSaving(false)
      return
    }
    if (!id || insertAt === null) {
      setSaving(false)
      return
    }
    await insertStep({
      step_type: pendingStep.type,
      action_type: null,
      config,
      position: insertAt,
    })
    setModal(null)
    setSaving(false)
  }

  const reorderAfterInsert = async (position: number) => {
    const toShift = steps.filter((step) => step.position >= position)
    for (const step of toShift) {
      await supabase
        .from('automation_steps')
        .update({ position: step.position + 1 })
        .eq('id', step.id)
    }
  }

  const insertStep = async (input: {
    step_type: AutomationStepType
    action_type: ActionType | null
    config: AutomationStep['config']
    position: number
  }) => {
    if (!id) return
    await reorderAfterInsert(input.position)
    await supabase.from('automation_steps').insert({
      automation_id: id,
      position: input.position,
      step_type: input.step_type,
      action_type: input.action_type,
      config: input.config,
    })
    await load()
  }

  const saveAction = async () => {
    if (!pendingAction || insertAt === null) return
    setSaving(true)
    const config =
      pendingAction === 'add_to_list' || pendingAction === 'remove_from_list'
        ? { list_id: lists[0]?.id ?? '' }
        : pendingAction === 'add_tag' || pendingAction === 'remove_tag'
          ? { tag_id: tags[0]?.id ?? '' }
          : pendingAction === 'zapier_webhook'
            ? { webhook_url: '' }
            : {
                email_subject: 'Welcome to SonicRing',
                email_body:
                  'Thanks for joining. Your AI team is ready to get started.',
              }

    await insertStep({
      step_type: 'action',
      action_type: pendingAction,
      config,
      position: insertAt,
    })
    setModal(null)
    setSaving(false)
  }

  const updateStepConfig = async (
    stepId: string,
    config: AutomationStep['config'],
  ) => {
    await supabase.from('automation_steps').update({ config }).eq('id', stepId)
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, config } : s)),
    )
  }

  const deleteStep = async (stepId: string) => {
    await supabase.from('automation_steps').delete().eq('id', stepId)
    await load()
  }

  if (loading) return <p className="fk-muted">Loading automation…</p>
  if (!automation) return <p className="fk-error">{error || 'Not found'}</p>

  return (
    <div className="fk-builder">
      <aside className="fk-builder__sidebar">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`fk-builder__nav${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      <div className="fk-builder__main">
        <header className="fk-builder__header">
          <div>
            <Link to="/admin/automations" className="fk-builder__back">
              Automations
            </Link>
            {editingName ? (
              <input
                type="text"
                className="fk-builder__name-input"
                value={nameDraft}
                autoFocus
                disabled={nameSaving}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void saveName()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelEditingName()
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="fk-builder__name-edit"
                onClick={startEditingName}
                title="Rename automation"
              >
                <h1>{automation.name}</h1>
                <span className="fk-builder__name-edit-icon" aria-hidden="true">
                  ✎
                </span>
              </button>
            )}
          </div>
          <div className="fk-builder__header-actions">
            <label
              className={`fk-switch${automation.status === 'active' ? ' is-on' : ''}${statusSaving ? ' is-busy' : ''}`}
            >
              <span className="fk-switch__label">
                {automation.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <input
                type="checkbox"
                className="fk-switch__input"
                checked={automation.status === 'active'}
                disabled={statusSaving}
                onChange={() => void toggleActive()}
                aria-label="Toggle automation active status"
              />
              <span className="fk-switch__track" aria-hidden="true" />
            </label>
            <Link to="/admin/automations" className="fk-builder__close" aria-label="Close">
              ×
            </Link>
          </div>
        </header>

        {error ? <p className="fk-builder__error">{error}</p> : null}

        {activeTab !== 'workflow' ? (
          <div className="fk-builder__canvas fk-builder__canvas--insight">
            <AutomationInsightsPanels
              tab={activeTab}
              automationId={automation.id}
            />
          </div>
        ) : null}

        {activeTab === 'workflow' ? (
        <div className="fk-builder__canvas">
          <div className="fk-builder__canvas-label">Workflow</div>

          <div className="fk-flow">
            <div
              className={`fk-flow-card fk-flow-card--trigger${!hasTrigger ? ' is-empty' : ''}`}
            >
              <button
                type="button"
                className="fk-flow-card__head"
                style={{
                  width: '100%',
                  border: 0,
                  background: 'transparent',
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={openEventModal}
              >
                <span className="fk-flow-card__icon fk-flow-card__icon--trigger">
                  ⚡
                </span>
                <div>
                  <p className="fk-flow-card__eyebrow">
                    {hasTrigger ? 'Trigger' : 'Start here'}
                  </p>
                  <strong>
                    {hasTrigger
                      ? (selectedEvent?.label ??
                        TRIGGER_LABELS[automation.trigger_type])
                      : 'Select an Event'}
                  </strong>
                </div>
              </button>
              {hasTrigger ? (
                <p className="fk-flow-card__meta">
                  {isOrderTrigger(automation.trigger_type)
                    ? describeOrderTriggerConfig(automation.trigger_config)
                    : isWebhookTrigger(automation.trigger_type)
                      ? describeWebhookTriggerConfig(automation.trigger_config)
                      : isCrmEntityTrigger(automation.trigger_type)
                        ? describeCrmEntityTriggerConfig(
                            automation.trigger_type,
                            automation.trigger_config,
                          )
                        : selectedEvent?.description}
                </p>
              ) : (
                <p className="fk-flow-card__meta">
                  Choose when this automation should start — form opt-in,
                  webhook, or Stripe purchase.
                </p>
              )}
              <div className="fk-flow-card__actions">
                {!hasTrigger ? (
                  <button
                    type="button"
                    className="fk-btn fk-btn--primary fk-btn--sm"
                    onClick={openEventModal}
                  >
                    Select an Event
                  </button>
                ) : null}
                {hasTrigger ? (
                  <button
                    type="button"
                    className="fk-btn fk-btn--ghost fk-btn--sm"
                    onClick={openEventModal}
                  >
                    Change event
                  </button>
                ) : null}
                {hasTrigger && isOrderTrigger(automation.trigger_type) ? (
                  <button
                    type="button"
                    className="fk-btn fk-btn--ghost fk-btn--sm"
                    onClick={() => {
                      setPendingEvent(automation.trigger_type as TriggerEventId)
                      openOrderConfig(automation.trigger_type as TriggerEventId)
                    }}
                  >
                    Configure products
                  </button>
                ) : null}
                {hasTrigger && isWebhookTrigger(automation.trigger_type) ? (
                  <button
                    type="button"
                    className="fk-btn fk-btn--ghost fk-btn--sm"
                    onClick={() => {
                      setPendingEvent('webhook_received')
                      openWebhookConfig()
                    }}
                  >
                    Configure webhook
                  </button>
                ) : null}
                {hasTrigger && isCrmEntityTrigger(automation.trigger_type) ? (
                  <button
                    type="button"
                    className="fk-btn fk-btn--ghost fk-btn--sm"
                    onClick={() =>
                      openCrmConfig(automation.trigger_type as TriggerEventId)
                    }
                  >
                    {isTagTrigger(automation.trigger_type)
                      ? 'Configure tags'
                      : 'Configure lists'}
                  </button>
                ) : null}
                <span
                  className={
                    automation.status === 'active'
                      ? 'fk-badge fk-badge--success'
                      : 'fk-badge fk-badge--danger'
                  }
                >
                  {automation.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {hasTrigger ? (
              <>
                <AddStepButton
                  onClick={() => openAddStep(0)}
                  disabled={saving}
                />

                {steps.map((step, index) => (
                  <div key={step.id} className="fk-flow__block">
                    <div className="fk-flow-card">
                      <div className="fk-flow-card__head">
                        <span
                          className={`fk-flow-card__icon ${
                            step.step_type === 'delay'
                              ? 'fk-flow-card__icon--delay'
                              : step.step_type === 'condition'
                                ? 'fk-flow-card__icon--condition'
                                : 'fk-flow-card__icon--action'
                          }`}
                        >
                          {step.step_type === 'delay'
                            ? '⏱'
                            : step.step_type === 'condition'
                              ? '⎇'
                              : '⚡'}
                        </span>
                        <div>
                          <p className="fk-flow-card__eyebrow">
                            Step {index + 1} · {stepTypeLabel(step.step_type)}
                          </p>
                          <strong>
                            {step.step_type === 'delay'
                              ? step.config.delay_amount != null
                                ? `Wait ${step.config.delay_amount} ${step.config.delay_unit ?? 'days'}`
                                : `Wait ${step.config.delay_days ?? 1} day(s)`
                              : step.step_type === 'condition'
                                ? step.config.condition_label || 'Condition'
                                : step.step_type === 'goal'
                                  ? step.config.goal_name || 'Goal'
                                  : step.step_type === 'jump'
                                    ? `Jump to step ${(step.config.jump_to_position ?? 0) + 1}`
                                    : step.step_type === 'split_path'
                                      ? `Split ${step.config.split_percent ?? 50}% / ${100 - (step.config.split_percent ?? 50)}%`
                                      : step.step_type === 'exit'
                                        ? step.config.exit_reason || 'Exit'
                                        : step.action_type
                                          ? ACTION_LABELS[step.action_type]
                                          : 'Action'}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="fk-flow-card__delete"
                          onClick={() => void deleteStep(step.id)}
                        >
                          Delete
                        </button>
                      </div>

                      {step.step_type === 'delay' ? (
                        <p className="fk-flow-card__meta">
                          {step.config.delay_mode === 'datetime'
                            ? `Delay until ${step.config.delay_datetime || 'a specific date and time'}.`
                            : step.config.delay_mode === 'custom_field'
                              ? `Delay until custom field: ${step.config.delay_custom_field || 'not set'}.`
                              : `Wait for ${step.config.delay_amount ?? step.config.delay_days ?? 1} ${
                                  step.config.delay_unit ?? 'days'
                                } before continuing.`}
                        </p>
                      ) : null}

                      {step.step_type === 'condition' ? (
                        <p className="fk-flow-card__meta">
                          {step.config.condition_label
                            ? `When ${step.config.condition_label} matches`
                            : 'Not configured'}
                        </p>
                      ) : null}

                      {step.step_type !== 'action' ? (
                        <div className="fk-flow-card__actions">
                          <button
                            type="button"
                            className="fk-btn fk-btn--ghost fk-btn--sm"
                            onClick={() => openEditStep(step)}
                          >
                            Configure
                          </button>
                        </div>
                      ) : null}

                      {step.action_type === 'send_email' ? (
                        <>
                          <label className="fk-field">
                            <span>Subject</span>
                            <input
                              type="text"
                              value={step.config.email_subject ?? ''}
                              onChange={(e) =>
                                void updateStepConfig(step.id, {
                                  ...step.config,
                                  email_subject: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="fk-field">
                            <span>Body</span>
                            <textarea
                              rows={3}
                              value={step.config.email_body ?? ''}
                              onChange={(e) =>
                                void updateStepConfig(step.id, {
                                  ...step.config,
                                  email_body: e.target.value,
                                })
                              }
                            />
                          </label>
                        </>
                      ) : null}

                      {step.action_type === 'add_to_list' ||
                      step.action_type === 'remove_from_list' ? (
                        <label className="fk-field">
                          <span>List</span>
                          <select
                            value={step.config.list_id ?? ''}
                            onChange={(e) =>
                              void updateStepConfig(step.id, {
                                ...step.config,
                                list_id: e.target.value,
                              })
                            }
                          >
                            <option value="" disabled>
                              Select a list
                            </option>
                            {lists.map((list) => (
                              <option key={list.id} value={list.id}>
                                {list.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      {step.action_type === 'add_tag' ||
                      step.action_type === 'remove_tag' ? (
                        <label className="fk-field">
                          <span>Tag</span>
                          <select
                            value={step.config.tag_id ?? ''}
                            onChange={(e) =>
                              void updateStepConfig(step.id, {
                                ...step.config,
                                tag_id: e.target.value,
                              })
                            }
                          >
                            <option value="" disabled>
                              Select a tag
                            </option>
                            {tags.map((tag) => (
                              <option key={tag.id} value={tag.id}>
                                {tag.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      {step.action_type === 'zapier_webhook' ? (
                        <label className="fk-field">
                          <span>Zapier Catch Hook URL</span>
                          <input
                            type="url"
                            placeholder="https://hooks.zapier.com/..."
                            value={step.config.webhook_url ?? ''}
                            onChange={(e) =>
                              setSteps((prev) =>
                                prev.map((s) =>
                                  s.id === step.id
                                    ? {
                                        ...s,
                                        config: {
                                          ...s.config,
                                          webhook_url: e.target.value,
                                        },
                                      }
                                    : s,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              void updateStepConfig(step.id, {
                                ...step.config,
                                webhook_url: e.target.value,
                              })
                            }
                          />
                        </label>
                      ) : null}
                    </div>

                    <AddStepButton
                      onClick={() => openAddStep(index + 1)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>
        ) : null}
      </div>

      {modal === 'event' ? (
        <PickerModal
          title="Select an Event"
          search={eventQuery}
          onSearch={setEventQuery}
          onClose={() => setModal(null)}
          categories={EVENT_CATEGORIES}
          activeCategory={eventCategory}
          onCategory={setEventCategory}
          onCancel={() => setModal(null)}
          onDone={() => void saveEvent()}
          doneDisabled={!pendingEvent || saving}
        >
          {eventGroups.length === 0 ? (
            <p className="fk-picker__empty">No events in this category.</p>
          ) : (
            eventGroups.map(([group, events]) => (
              <div key={group} className="fk-picker__group">
                <h3>{group}</h3>
                <div className="fk-picker__chips">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={`fk-picker__chip${
                        pendingEvent === event.id ? ' is-selected' : ''
                      }`}
                      onClick={() => setPendingEvent(event.id)}
                    >
                      {event.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </PickerModal>
      ) : null}

      {modal === 'orderConfig' && pendingEvent ? (
        <OrderTriggerConfigModal
          title={TRIGGER_LABELS[pendingEvent] ?? 'Order Created'}
          config={pendingOrderConfig}
          onChange={setPendingOrderConfig}
          onCancel={() => setModal('event')}
          onSave={() => void saveOrderConfig()}
          saving={saving}
        />
      ) : null}

      {modal === 'webhookConfig' && automation ? (
        <WebhookTriggerConfigModal
          automationId={automation.id}
          config={pendingWebhookConfig}
          onChange={setPendingWebhookConfig}
          onCancel={() => setModal('event')}
          onSave={() => void saveWebhookConfig()}
          saving={saving}
          onReceived={(next) => {
            setPendingWebhookConfig(next)
            setAutomation((prev) =>
              prev
                ? {
                    ...prev,
                    trigger_type: 'webhook_received',
                    trigger_config: next,
                  }
                : prev,
            )
          }}
        />
      ) : null}

      {modal === 'crmConfig' && pendingEvent ? (
        <CrmEntityTriggerConfigModal
          title={TRIGGER_LABELS[pendingEvent] ?? 'CRM Trigger'}
          triggerId={pendingEvent}
          config={pendingCrmConfig}
          tags={tags}
          lists={lists}
          onChange={setPendingCrmConfig}
          onCancel={() => setModal('event')}
          onSave={() => void saveCrmConfig()}
          saving={saving}
        />
      ) : null}

      {modal === 'addStep' ? (
        <div className="fk-modal-overlay" role="presentation" onClick={() => setModal(null)}>
          <div
            className="fk-light-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-step-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fk-add-step-modal__head">
              <h2 id="add-step-title">Add Step</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="fk-add-step-modal__grid">
              {ADD_STEP_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseAddStepOption(option.id)}
                >
                  <span
                    className={`fk-add-step-modal__icon ${option.iconClass}`}
                    aria-hidden="true"
                  >
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {modal === 'delayConfig' ? (
        <DelayConfigModal
          draft={pendingDelay}
          onChange={setPendingDelay}
          onCancel={() =>
            setModal(editingStepId ? null : 'addStep')
          }
          onSave={() => void saveDelayStep()}
          saving={saving}
        />
      ) : null}

      {modal === 'conditionConfig' ? (
        <ConditionConfigModal
          draft={pendingCondition}
          lists={lists}
          tags={tags}
          onChange={setPendingCondition}
          onCancel={() =>
            setModal(editingStepId ? null : 'addStep')
          }
          onSave={() => void saveConditionStep()}
          saving={saving}
        />
      ) : null}

      {modal === 'stepConfig' ? (
        <GenericStepConfigModal
          draft={pendingStep}
          stepCount={steps.length}
          onChange={setPendingStep}
          onCancel={() =>
            setModal(editingStepId ? null : 'addStep')
          }
          onSave={() => void saveGenericStep()}
          saving={saving}
        />
      ) : null}

      {modal === 'action' ? (
        <PickerModal
          title="Select an Action"
          search={actionQuery}
          onSearch={setActionQuery}
          onClose={() => setModal('addStep')}
          categories={ACTION_CATEGORIES}
          activeCategory={actionCategory}
          onCategory={setActionCategory}
          onCancel={() => setModal('addStep')}
          onDone={() => void saveAction()}
          doneDisabled={!pendingAction || saving}
        >
          {actionGroups.length === 0 ? (
            <p className="fk-picker__empty">No actions in this category.</p>
          ) : (
            actionGroups.map(([group, actions]) => (
              <div key={group} className="fk-picker__group">
                <h3>{group}</h3>
                <div className="fk-picker__chips">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className={`fk-picker__chip${
                        pendingAction === action.id ? ' is-selected' : ''
                      }`}
                      onClick={() => setPendingAction(action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </PickerModal>
      ) : null}
    </div>
  )
}

function AddStepButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="fk-flow__connector">
      <button
        type="button"
        className="fk-flow__add"
        onClick={onClick}
        disabled={disabled}
        aria-label="Add step"
      >
        +
      </button>
    </div>
  )
}

function PickerModal<T extends string>({
  title,
  search,
  onSearch,
  onClose,
  categories,
  activeCategory,
  onCategory,
  children,
  onCancel,
  onDone,
  doneDisabled,
}: {
  title: string
  search: string
  onSearch: (value: string) => void
  onClose: () => void
  categories: { id: T; label: string }[]
  activeCategory: T
  onCategory: (id: T) => void
  children: ReactNode
  onCancel: () => void
  onDone: () => void
  doneDisabled?: boolean
}) {
  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="fk-picker"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fk-picker__header">
          <h2>{title}</h2>
          <div className="fk-picker__header-right">
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>
        <div className="fk-picker__body">
          <aside className="fk-picker__cats">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'is-active' : ''}
                onClick={() => onCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </aside>
          <div className="fk-picker__content">{children}</div>
        </div>
        <footer className="fk-picker__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onDone}
            disabled={doneDisabled}
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}

function OrderTriggerConfigModal({
  title,
  config,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  title: string
  config: AutomationTriggerConfig
  onChange: (config: AutomationTriggerConfig) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  const statuses = config.order_statuses ?? ['completed']
  const contains = (config.order_contains ?? 'any') as OrderContainsMode
  const productIds = config.product_ids ?? []
  const frequency = (config.run_frequency ?? 'once') as OrderRunFrequency

  const toggleStatus = (status: OrderStatusOption) => {
    const next = statuses.includes(status)
      ? statuses.filter((item) => item !== status)
      : [...statuses, status]
    onChange({ ...config, order_statuses: next })
  }

  const toggleProduct = (productId: string) => {
    const next = productIds.includes(productId)
      ? productIds.filter((item) => item !== productId)
      : [...productIds, productId]
    onChange({ ...config, product_ids: next })
  }

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-order-config"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fk-order-config__header">
          <div className="fk-order-config__title">
            <span className="fk-order-config__icon" aria-hidden="true">
              🚀
            </span>
            <h2 id="order-config-title">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>

        <div className="fk-order-config__body">
          <fieldset className="fk-order-config__section">
            <legend>
              Order Statuses <span>*</span>
            </legend>
            <div className="fk-order-config__options">
              {ORDER_STATUS_OPTIONS.map((status) => (
                <label key={status.id} className="fk-order-config__check">
                  <input
                    type="checkbox"
                    checked={statuses.includes(status.id)}
                    onChange={() => toggleStatus(status.id)}
                  />
                  <span>{status.label}</span>
                </label>
              ))}
            </div>
            <p className="fk-muted">
              This automation would run on new orders with selected statuses.
            </p>
          </fieldset>

          <fieldset className="fk-order-config__section">
            <legend>Order Contains</legend>
            <div className="fk-order-config__options is-stack">
              {(
                [
                  { id: 'any', label: 'Any Product' },
                  { id: 'specific', label: 'Specific Products' },
                ] as const
              ).map((option) => (
                <label key={option.id} className="fk-order-config__check">
                  <input
                    type="radio"
                    name="order-contains"
                    checked={contains === option.id}
                    onChange={() =>
                      onChange({
                        ...config,
                        order_contains: option.id,
                        product_ids:
                          option.id === 'specific' ? productIds : [],
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            {contains === 'specific' ? (
              <div className="fk-order-config__products">
                <p className="fk-order-config__products-label">
                  Select plan / product <span>*</span>
                </p>
                <div className="fk-order-config__options">
                  {checkoutPlans.map((plan) => (
                    <label key={plan.id} className="fk-order-config__check">
                      <input
                        type="checkbox"
                        checked={productIds.includes(plan.id)}
                        onChange={() => toggleProduct(plan.id)}
                      />
                      <span>
                        {plan.name}
                        <em>{plan.priceLabel}</em>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="fk-order-config__section">
            <legend>Runs On Contact</legend>
            <div className="fk-order-config__options is-stack">
              {(
                [
                  { id: 'once', label: 'Once' },
                  { id: 'multiple', label: 'Multiple Times' },
                ] as const
              ).map((option) => (
                <label key={option.id} className="fk-order-config__check">
                  <input
                    type="radio"
                    name="run-frequency"
                    checked={frequency === option.id}
                    onChange={() =>
                      onChange({ ...config, run_frequency: option.id })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="fk-order-config__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}

function WebhookTriggerConfigModal({
  automationId,
  config,
  onChange,
  onCancel,
  onSave,
  saving,
  onReceived,
}: {
  automationId: string
  config: AutomationTriggerConfig
  onChange: (config: AutomationTriggerConfig) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  onReceived: (config: AutomationTriggerConfig) => void
}) {
  const [copied, setCopied] = useState(false)
  const [listening, setListening] = useState(false)
  const [listenError, setListenError] = useState('')
  const [received, setReceived] = useState(false)

  const webhookKey = config.webhook_key || defaultWebhookTriggerConfig().webhook_key
  const webhookUrl = buildAutomationWebhookUrl(automationId, webhookKey)
  const frequency = (config.run_frequency ?? 'once') as OrderRunFrequency

  useEffect(() => {
    if (!config.webhook_key) {
      onChange({ ...config, webhook_key: webhookKey })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!listening) return

    let cancelled = false
    const started = Date.now()

    const poll = async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('trigger_config')
        .eq('id', automationId)
        .single()

      if (cancelled) return
      if (error) {
        setListenError('Could not listen for webhook.')
        setListening(false)
        return
      }

      const next = (data?.trigger_config ?? {}) as AutomationTriggerConfig
      const receivedAt = next.last_received_at
        ? new Date(next.last_received_at).getTime()
        : 0

      if (receivedAt >= started - 1000) {
        setReceived(true)
        setListening(false)
        setListenError('')
        onReceived({
          ...config,
          ...next,
          webhook_key: webhookKey,
          run_frequency: config.run_frequency ?? next.run_frequency ?? 'once',
        })
        return
      }

      if (Date.now() - started > 60000) {
        setListening(false)
        setListenError('No webhook received within 60 seconds. Try again.')
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [listening, automationId, config, onReceived, webhookKey])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setListenError('Could not copy URL.')
    }
  }

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-order-config fk-webhook-config"
        role="dialog"
        aria-modal="true"
        aria-labelledby="webhook-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fk-order-config__header">
          <div className="fk-order-config__title">
            <span className="fk-order-config__icon" aria-hidden="true">
              🚀
            </span>
            <h2 id="webhook-config-title">Webhook Received</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>

        <div className="fk-order-config__body">
          <div className="fk-webhook-config__url-box">
            <textarea readOnly rows={3} value={webhookUrl} />
            <div className="fk-webhook-config__url-actions">
              <p className="fk-muted">Use this custom webhook URL to send requests to.</p>
              <button type="button" className="fk-btn fk-btn--ghost fk-btn--sm" onClick={() => void copyUrl()}>
                {copied ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="fk-webhook-config__test">
            <div className="fk-webhook-config__test-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3>Test Your Event</h3>
            <p className="fk-muted">Send a request to the webhook URL.</p>
            <button
              type="button"
              className="fk-btn fk-btn--ghost"
              disabled={listening}
              onClick={() => {
                setReceived(false)
                setListenError('')
                setListening(true)
              }}
            >
              {listening ? 'Listening…' : 'Receive Webhook'}
            </button>
            {listening ? (
              <p className="fk-webhook-config__status is-listening">
                Waiting for an incoming webhook…
              </p>
            ) : null}
            {received ? (
              <p className="fk-webhook-config__status is-success">
                Webhook received successfully.
              </p>
            ) : null}
            {listenError ? <p className="fk-error">{listenError}</p> : null}
            {config.last_received_at && !listening ? (
              <p className="fk-muted">
                Last received{' '}
                {new Date(config.last_received_at).toLocaleString()}
              </p>
            ) : null}
          </div>

          <fieldset className="fk-order-config__section">
            <legend>Runs On Contact</legend>
            <div className="fk-order-config__options is-stack">
              {(
                [
                  { id: 'once', label: 'Once' },
                  { id: 'multiple', label: 'Multiple Times' },
                ] as const
              ).map((option) => (
                <label key={option.id} className="fk-order-config__check">
                  <input
                    type="radio"
                    name="webhook-run-frequency"
                    checked={frequency === option.id}
                    onChange={() =>
                      onChange({ ...config, run_frequency: option.id })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="fk-order-config__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}

function CrmEntityTriggerConfigModal({
  title,
  triggerId,
  config,
  tags,
  lists,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  title: string
  triggerId: string
  config: AutomationTriggerConfig
  tags: Tag[]
  lists: List[]
  onChange: (config: AutomationTriggerConfig) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  const [query, setQuery] = useState('')
  const isTag = isTagTrigger(triggerId)
  const contains = (config.entity_contains ?? 'specific') as 'any' | 'specific'
  const selectedIds = isTag ? config.tag_ids ?? [] : config.list_ids ?? []
  const frequency = (config.run_frequency ?? 'once') as OrderRunFrequency
  const options = isTag ? tags : lists
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((item) => item.name.toLowerCase().includes(q))
  }, [options, query])

  const toggleId = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id]
    onChange(
      isTag
        ? { ...config, tag_ids: next }
        : { ...config, list_ids: next },
    )
  }

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-order-config"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fk-order-config__header">
          <div className="fk-order-config__title">
            <span className="fk-order-config__icon" aria-hidden="true">
              🚀
            </span>
            <h2 id="crm-config-title">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </header>

        <div className="fk-order-config__body">
          <fieldset className="fk-order-config__section">
            <legend>
              {isTag ? 'Tag Contains' : 'List Contains'} <span>*</span>
            </legend>
            <div className="fk-order-config__options">
              {(
                [
                  { id: 'specific', label: isTag ? 'Specific Tag' : 'Specific List' },
                  { id: 'any', label: isTag ? 'Any Tag' : 'Any List' },
                ] as const
              ).map((option) => (
                <label key={option.id} className="fk-order-config__check">
                  <input
                    type="radio"
                    name="crm-entity-contains"
                    checked={contains === option.id}
                    onChange={() =>
                      onChange({
                        ...config,
                        entity_contains: option.id,
                        tag_ids: option.id === 'specific' ? config.tag_ids ?? [] : [],
                        list_ids:
                          option.id === 'specific' ? config.list_ids ?? [] : [],
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {contains === 'specific' ? (
            <fieldset className="fk-order-config__section">
              <legend>
                {isTag ? 'Select Tags' : 'Select Lists'} <span>*</span>
              </legend>
              <label className="fk-crm-search">
                <span className="fk-crm-search__icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  placeholder="Search by name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="fk-crm-select-list">
                {filtered.length === 0 ? (
                  <p className="fk-muted">
                    No {isTag ? 'tags' : 'lists'} found.
                  </p>
                ) : (
                  filtered.map((item) => (
                    <label key={item.id} className="fk-order-config__check">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleId(item.id)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedIds.length > 0 ? (
                <div className="fk-crm-selected">
                  {selectedIds.map((id) => {
                    const item = options.find((entry) => entry.id === id)
                    if (!item) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        className="fk-crm-chip"
                        onClick={() => toggleId(id)}
                      >
                        {item.name} ×
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <fieldset className="fk-order-config__section">
            <legend>Runs On Contact</legend>
            <div className="fk-order-config__options">
              {(
                [
                  { id: 'once', label: 'Once' },
                  { id: 'multiple', label: 'Multiple Times' },
                ] as const
              ).map((option) => (
                <label key={option.id} className="fk-order-config__check">
                  <input
                    type="radio"
                    name="crm-run-frequency"
                    checked={frequency === option.id}
                    onChange={() =>
                      onChange({ ...config, run_frequency: option.id })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="fk-order-config__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}

function DelayConfigModal({
  draft,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  draft: DelayDraft
  onChange: (draft: DelayDraft) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  const canSave =
    draft.mode === 'period'
      ? draft.amount >= 0
      : draft.mode === 'datetime'
        ? Boolean(draft.datetime)
        : Boolean(draft.customField.trim())

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-light-modal fk-light-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delay-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fk-light-modal__head">
          <div className="fk-light-modal__title">
            <span className="fk-light-modal__title-icon is-delay" aria-hidden="true">
              ⏱
            </span>
            <h2 id="delay-config-title">Delay</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="fk-light-modal__body">
          <label className="fk-delay-option">
            <input
              type="radio"
              name="delay-mode"
              checked={draft.mode === 'period'}
              onChange={() => onChange({ ...draft, mode: 'period' })}
            />
            <div>
              <strong>Delay for a specific period</strong>
              <p>
                Wait for a specified number of hours, days, or weeks before
                continuing.
              </p>
              {draft.mode === 'period' ? (
                <>
                  <div className="fk-delay-option__controls">
                    <input
                      type="number"
                      min={0}
                      value={draft.amount}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          amount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                    <select
                      value={draft.unit}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          unit: e.target.value as DelayUnit,
                        })
                      }
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                  <div className="fk-delay-option__checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.untilTime}
                        onChange={(e) =>
                          onChange({ ...draft, untilTime: e.target.checked })
                        }
                      />
                      Delay until a specific time of day
                    </label>
                    {draft.untilTime ? (
                      <input
                        type="time"
                        value={draft.untilTimeValue}
                        onChange={(e) =>
                          onChange({ ...draft, untilTimeValue: e.target.value })
                        }
                        style={{ marginLeft: '1.6rem', marginBottom: '0.5rem' }}
                      />
                    ) : null}
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.untilWeekday}
                        onChange={(e) =>
                          onChange({
                            ...draft,
                            untilWeekday: e.target.checked,
                          })
                        }
                      />
                      Delay until a specific day(s) of the week
                    </label>
                    {draft.untilWeekday ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          marginLeft: '1.6rem',
                        }}
                      >
                        {WEEKDAY_OPTIONS.map((day) => {
                          const checked = draft.untilWeekdays.includes(day.value)
                          return (
                            <label
                              key={day.value}
                              className="fk-weekday-chip"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.8rem',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  onChange({
                                    ...draft,
                                    untilWeekdays: e.target.checked
                                      ? [...draft.untilWeekdays, day.value]
                                      : draft.untilWeekdays.filter(
                                          (d) => d !== day.value,
                                        ),
                                  })
                                }
                              />
                              {day.label}
                            </label>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="fk-delay-summary">
                    <span>i</span>
                    <p>{delaySummary(draft)}</p>
                  </div>
                </>
              ) : null}
            </div>
          </label>

          <label className="fk-delay-option">
            <input
              type="radio"
              name="delay-mode"
              checked={draft.mode === 'datetime'}
              onChange={() => onChange({ ...draft, mode: 'datetime' })}
            />
            <div>
              <strong>Delay until a specific date and time</strong>
              <p>Set a specific date and time.</p>
              {draft.mode === 'datetime' ? (
                <div className="fk-delay-option__controls">
                  <input
                    type="datetime-local"
                    value={draft.datetime}
                    onChange={(e) =>
                      onChange({ ...draft, datetime: e.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
          </label>

          <label className="fk-delay-option">
            <input
              type="radio"
              name="delay-mode"
              checked={draft.mode === 'custom_field'}
              onChange={() => onChange({ ...draft, mode: 'custom_field' })}
            />
            <div>
              <strong>Delay until a custom field date</strong>
              <p>Choose from contact custom fields.</p>
              {draft.mode === 'custom_field' ? (
                <div className="fk-delay-option__controls">
                  <select
                    value={draft.customField}
                    onChange={(e) =>
                      onChange({ ...draft, customField: e.target.value })
                    }
                  >
                    <option value="">Select field</option>
                    <option value="date_of_birth">Date of Birth</option>
                    <option value="created_at">Created At</option>
                    <option value="updated_at">Updated At</option>
                  </select>
                </div>
              ) : null}
            </div>
          </label>
        </div>

        <div className="fk-light-modal__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving || !canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ConditionConfigModal({
  draft,
  lists,
  tags,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  draft: ConditionDraft
  lists: List[]
  tags: Tag[]
  onChange: (draft: ConditionDraft) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  const hasLegacy = draft.legacyCategories.length > 0 && draft.rules.length === 0

  const updateRule = (index: number, patch: Partial<ConditionRule>) => {
    const next = draft.rules.map((rule, i) =>
      i === index ? { ...rule, ...patch } : rule,
    )
    onChange({ ...draft, rules: next })
  }

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-light-modal fk-light-modal--lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="condition-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fk-light-modal__head">
          <div className="fk-light-modal__title">
            <span
              className="fk-light-modal__title-icon is-condition"
              aria-hidden="true"
            >
              ⎇
            </span>
            <h2 id="condition-config-title">Condition</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        {hasLegacy ? (
          <div className="fk-condition-empty">
            <h3>Legacy condition</h3>
            <p>
              This condition was saved before the rule builder shipped:{' '}
              <strong>{draft.legacyCategories.join(' OR ')}</strong>. It still
              runs as-is. Upgrade it to use real field/operator/value rules.
            </p>
            <button
              type="button"
              className="fk-btn fk-btn--primary"
              onClick={() =>
                onChange({
                  rules: [defaultConditionRule()],
                  matchMode: 'all',
                  legacyCategories: [],
                })
              }
            >
              Upgrade to rule builder
            </button>
          </div>
        ) : !draft.rules.length ? (
          <div className="fk-condition-empty">
            <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true">
              <rect
                x="12"
                y="6"
                width="48"
                height="40"
                rx="6"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M22 18h28M22 26h20M22 34h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <h3>No Condition</h3>
            <p>
              Add a rule to segment and decide whether contacts continue
              through this automation.
            </p>
            <button
              type="button"
              className="fk-btn fk-btn--primary"
              onClick={() =>
                onChange({ ...draft, rules: [defaultConditionRule()] })
              }
            >
              Add New Condition
            </button>
          </div>
        ) : (
          <div className="fk-light-modal__body">
            <div className="fk-condition-row" style={{ marginBottom: '0.75rem' }}>
              <span>Match</span>
              <div className="fk-condition-select">
                <select
                  value={draft.matchMode}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      matchMode: e.target.value as ConditionMatchMode,
                    })
                  }
                >
                  <option value="all">All rules (AND)</option>
                  <option value="any">Any rule (OR)</option>
                </select>
              </div>
            </div>

            {draft.rules.map((rule, index) => {
              const operators = operatorsForConditionField(rule.field)
              const needsValue = conditionRuleNeedsValue(rule.operator)
              return (
                <div key={`rule-${index}`} className="fk-condition-box">
                  <div className="fk-condition-row">
                    <span>For</span>
                    <div className="fk-condition-select">
                      <select
                        value={rule.field}
                        onChange={(e) => {
                          const field = e.target.value as ConditionField
                          const nextOperators = operatorsForConditionField(field)
                          updateRule(index, {
                            field,
                            operator: nextOperators[0],
                            value: '',
                          })
                        }}
                      >
                        {CONDITION_FIELD_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fk-condition-select">
                      <select
                        value={rule.operator}
                        onChange={(e) =>
                          updateRule(index, {
                            operator: e.target.value as ConditionOperator,
                          })
                        }
                      >
                        {operators.map((op) => (
                          <option key={op} value={op}>
                            {CONDITION_OPERATOR_LABELS[op]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {needsValue ? (
                      rule.field === 'has_tag' ? (
                        <div className="fk-condition-select">
                          <select
                            value={rule.value ?? ''}
                            onChange={(e) =>
                              updateRule(index, { value: e.target.value })
                            }
                          >
                            <option value="">Select tag</option>
                            {tags.map((tag) => (
                              <option key={tag.id} value={tag.id}>
                                {tag.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : rule.field === 'has_list' ? (
                        <div className="fk-condition-select">
                          <select
                            value={rule.value ?? ''}
                            onChange={(e) =>
                              updateRule(index, { value: e.target.value })
                            }
                          >
                            <option value="">Select list</option>
                            {lists.map((list) => (
                              <option key={list.id} value={list.id}>
                                {list.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : rule.field === 'status' ? (
                        <div className="fk-condition-select">
                          <select
                            value={rule.value ?? ''}
                            onChange={(e) =>
                              updateRule(index, { value: e.target.value })
                            }
                          >
                            <option value="">Select status</option>
                            <option value="subscribed">Subscribed</option>
                            <option value="unsubscribed">Unsubscribed</option>
                            <option value="bounced">Bounced</option>
                          </select>
                        </div>
                      ) : (
                        <input
                          type={rule.field === 'total_revenue' ? 'number' : 'text'}
                          value={rule.value ?? ''}
                          placeholder="Value"
                          onChange={(e) =>
                            updateRule(index, { value: e.target.value })
                          }
                        />
                      )
                    ) : null}
                    <button
                      type="button"
                      className="fk-flow-card__delete"
                      onClick={() =>
                        onChange({
                          ...draft,
                          rules: draft.rules.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
            <button
              type="button"
              className="fk-condition-or"
              onClick={() =>
                onChange({
                  ...draft,
                  rules: [...draft.rules, defaultConditionRule()],
                })
              }
            >
              Add Rule
            </button>
          </div>
        )}

        <div className="fk-light-modal__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving || hasLegacy || !draft.rules.some(conditionRuleIsValid)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function GenericStepConfigModal({
  draft,
  stepCount,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  draft: StepDraft
  stepCount: number
  onChange: (draft: StepDraft) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  const title =
    draft.type === 'goal'
      ? 'Goal'
      : draft.type === 'jump'
        ? 'Jump'
        : draft.type === 'split_path'
          ? 'Split Path'
          : 'Exit'
  const iconClass =
    draft.type === 'goal'
      ? 'is-goal'
      : draft.type === 'jump'
        ? 'is-jump'
        : draft.type === 'split_path'
          ? 'is-split'
          : 'is-exit'
  const icon =
    draft.type === 'goal'
      ? '◎'
      : draft.type === 'jump'
        ? '↝'
        : draft.type === 'split_path'
          ? '⑂'
          : '⇨'

  return (
    <div className="fk-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="fk-light-modal fk-light-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generic-step-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fk-light-modal__head">
          <div className="fk-light-modal__title">
            <span
              className={`fk-light-modal__title-icon ${iconClass}`}
              aria-hidden="true"
            >
              {icon}
            </span>
            <h2 id="generic-step-title">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="fk-light-modal__body">
          {draft.type === 'goal' ? (
            <label className="fk-step-field">
              <span>Goal name</span>
              <input
                type="text"
                value={draft.goalName}
                onChange={(e) =>
                  onChange({ ...draft, goalName: e.target.value })
                }
                placeholder="Primary Goal"
              />
              <p>When this goal is reached, the contact exits the automation.</p>
            </label>
          ) : null}

          {draft.type === 'jump' ? (
            <label className="fk-step-field">
              <span>Jump to step</span>
              <select
                value={draft.jumpToPosition}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    jumpToPosition: Number(e.target.value) || 0,
                  })
                }
              >
                {Array.from({ length: Math.max(stepCount, 1) }, (_, index) => (
                  <option key={index} value={index}>
                    Step {index + 1}
                  </option>
                ))}
              </select>
              <p>Move the contact to another step in this workflow.</p>
            </label>
          ) : null}

          {draft.type === 'split_path' ? (
            <label className="fk-step-field">
              <span>Path A percentage</span>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.splitPercent}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    splitPercent: Math.min(
                      100,
                      Math.max(0, Number(e.target.value) || 0),
                    ),
                  })
                }
              />
              <p>
                Path A: {draft.splitPercent}% · Path B:{' '}
                {100 - draft.splitPercent}%
              </p>
            </label>
          ) : null}

          {draft.type === 'exit' ? (
            <label className="fk-step-field">
              <span>Exit reason</span>
              <input
                type="text"
                value={draft.exitReason}
                onChange={(e) =>
                  onChange({ ...draft, exitReason: e.target.value })
                }
                placeholder="Exit automation"
              />
              <p>Stops the workflow for this contact immediately.</p>
            </label>
          ) : null}
        </div>

        <div className="fk-light-modal__footer">
          <button type="button" className="fk-btn fk-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fk-btn fk-btn--primary"
            onClick={onSave}
            disabled={saving}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
