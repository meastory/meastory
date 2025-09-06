import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../stores/authStore'

export type TierKey = 'guest' | 'free' | 'paid' | 'enterprise'

export interface TierPolicy {
  key: TierKey
  rank: number
  duration_minutes: number | null
  sessions_per_day: number | null
  max_participants: number
  show_timer_in_waiting: boolean
  show_timer_in_menu: boolean
  inroom_warning_threshold_minutes: number | null
}

const defaultPolicies: Record<TierKey, TierPolicy> = {
  guest: {
    key: 'guest', rank: 0,
    duration_minutes: 30, sessions_per_day: 3, max_participants: 2,
    show_timer_in_waiting: true, show_timer_in_menu: true, inroom_warning_threshold_minutes: 5,
  },
  free: {
    key: 'free', rank: 1,
    duration_minutes: 60, sessions_per_day: 5, max_participants: 2,
    show_timer_in_waiting: true, show_timer_in_menu: true, inroom_warning_threshold_minutes: 10,
  },
  paid: {
    key: 'paid', rank: 2,
    duration_minutes: 180, sessions_per_day: null, max_participants: 6,
    show_timer_in_waiting: false, show_timer_in_menu: true, inroom_warning_threshold_minutes: 10,
  },
  enterprise: {
    key: 'enterprise', rank: 3,
    duration_minutes: null, sessions_per_day: null, max_participants: 10,
    show_timer_in_waiting: false, show_timer_in_menu: false, inroom_warning_threshold_minutes: null,
  },
}

export function useTierPolicy() {
  const [policies, setPolicies] = useState<Record<TierKey, TierPolicy>>(defaultPolicies)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('tiers')
          .select('key, rank, duration_minutes, sessions_per_day, max_participants, show_timer_in_waiting, show_timer_in_menu, inroom_warning_threshold_minutes')
        if (error) throw error
        const next = { ...defaultPolicies }
        for (const row of (data || []) as unknown as TierPolicy[]) {
          const key = row.key as TierKey
          if (key in next) {
            next[key] = {
              key,
              rank: row.rank ?? defaultPolicies[key].rank,
              duration_minutes: row.duration_minutes ?? defaultPolicies[key].duration_minutes,
              sessions_per_day: row.sessions_per_day ?? defaultPolicies[key].sessions_per_day,
              max_participants: row.max_participants ?? defaultPolicies[key].max_participants,
              show_timer_in_waiting: row.show_timer_in_waiting ?? defaultPolicies[key].show_timer_in_waiting,
              show_timer_in_menu: row.show_timer_in_menu ?? defaultPolicies[key].show_timer_in_menu,
              inroom_warning_threshold_minutes: row.inroom_warning_threshold_minutes ?? defaultPolicies[key].inroom_warning_threshold_minutes,
            }
          }
        }
        if (active) setPolicies(next)
      } catch (e) {
        console.warn('Failed to load tier policies, using defaults', e)
        if (active) setError((e as { message?: string }).message || 'policy_load_failed')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const getPolicyForTier = useMemo(() => {
    return (tier: TierKey): TierPolicy => policies[tier] || defaultPolicies.guest
  }, [policies])

  return { policies, getPolicyForTier, loading, error }
}


