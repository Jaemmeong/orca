import { describe, expect, it } from 'vitest'
import {
  forgetLaunchConfirmation,
  isDestructiveRecoveryAction
} from './agent-launch-recovery-action-copy'

describe('forgetLaunchConfirmation', () => {
  it('is a destructive confirmation carrying the plan :498 could-still-be-running warning', () => {
    const options = forgetLaunchConfirmation()
    expect(options.confirmVariant).toBe('destructive')
    expect(options.description).toBe(
      'Orca cannot reach the terminal host. Forgetting does not stop the remote process; it may still be running.'
    )
    expect(options.title).toBe('Forget this launch?')
    expect(options.confirmLabel).toBe('Forget launch')
  })
})

describe('isDestructiveRecoveryAction', () => {
  it('marks only forget-launch as destructive', () => {
    expect(isDestructiveRecoveryAction('forget-launch')).toBe(true)
    expect(isDestructiveRecoveryAction('retry')).toBe(false)
    expect(isDestructiveRecoveryAction('choose-agent')).toBe(false)
  })
})
