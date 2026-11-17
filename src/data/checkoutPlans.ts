import { featureLabels, pricingPlans, type FeatureValue } from '../data'

export type CheckoutPlanId = 'starter' | 'growth' | 'pro'

export type CheckoutFeature = {
  label: string
  value: FeatureValue
}

export type CheckoutPlan = {
  id: CheckoutPlanId
  name: string
  priceLabel: string
  amountCents: number
  description: string
  features: CheckoutFeature[]
  featured?: boolean
}

const planMeta: Record<
  CheckoutPlanId,
  { description: string; featured?: boolean; amountCents: number }
> = {
  starter: {
    description: 'Get The Front Desk. Your first AI team, live.',
    amountCents: 29900,
  },
  growth: {
    description: 'Connect The Engine. Marketing, follow-up and ops in one place.',
    amountCents: 49900,
    featured: true,
  },
  pro: {
    description: 'Run At Greater Scale. Power, access and white label.',
    amountCents: 79900,
  },
}

function toPlanId(name: string): CheckoutPlanId | null {
  const key = name.toLowerCase()
  if (key === 'starter' || key === 'growth' || key === 'pro') return key
  return null
}

export const checkoutPlans: CheckoutPlan[] = pricingPlans.flatMap((plan) => {
  const id = toPlanId(plan.name)
  if (!id) return []
  const meta = planMeta[id]

  // Skip "Monthly Price" — already shown as the card price
  const features = featureLabels.slice(1).map((label, index) => ({
    label,
    value: plan.values[index + 1],
  }))

  return [
    {
      id,
      name: plan.name,
      priceLabel: plan.price,
      amountCents: meta.amountCents,
      description: meta.description,
      features,
      featured: meta.featured,
    },
  ]
})

export function getCheckoutPlan(id: string | null | undefined) {
  return checkoutPlans.find((plan) => plan.id === id) ?? null
}

export function formatFeatureValue(value: FeatureValue) {
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included'
  return value
}
