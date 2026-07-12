// Ledger #12: the host is the single minting authority for an automation run's
// persisted launch-failure wrapper. These cover the three field states — absent
// (preserve), present-null (clear), present-value (mint) — and prove a
// client-supplied wrapper is re-minted so it can never win over the host.
import { describe, expect, it } from 'vitest'
import type { PersistedAgentLaunchFailure } from '../../shared/agent-launch-contract'
import type { AutomationDispatchResult } from '../../shared/automations-types'
import { stampAutomationDispatchLaunchFailure } from './automation-launch-failure-stamp'

describe('stampAutomationDispatchLaunchFailure (ledger #12)', () => {
  it('mints the persisted wrapper for a plain failure from the dispatch arm', () => {
    const result: AutomationDispatchResult = {
      runId: 'run-1',
      status: 'dispatch_failed',
      error: 'launch failed',
      agentLaunchFailure: {
        code: 'invalid_launch_snapshot',
        requestedAgent: 'custom-agent:codex:11111111-1111-4111-8111-111111111111',
        baseAgent: 'codex'
      }
    }

    const stamped = stampAutomationDispatchLaunchFailure(result)

    expect(stamped.agentLaunchFailure).toMatchObject({
      code: 'invalid_launch_snapshot',
      requestedAgent: 'custom-agent:codex:11111111-1111-4111-8111-111111111111',
      baseAgent: 'codex',
      version: 1,
      intent: 'automation'
    })
    expect(stamped.agentLaunchFailure?.failureId).toBeTruthy()
    expect(typeof stamped.agentLaunchFailure?.occurredAt).toBe('number')
  })

  it('re-mints a client-supplied wrapper so the host id always wins', () => {
    // A wrapper the client tried to forge (Persisted is assignable to the plain
    // wire field). The stamp must overwrite the id and time.
    const clientWrapper: PersistedAgentLaunchFailure = {
      code: 'invalid_launch_snapshot',
      version: 1,
      failureId: 'client-forged-id',
      intent: 'automation',
      occurredAt: 42
    }
    const result: AutomationDispatchResult = {
      runId: 'run-1',
      status: 'dispatch_failed',
      agentLaunchFailure: clientWrapper
    }

    const stamped = stampAutomationDispatchLaunchFailure(result)

    expect(stamped.agentLaunchFailure?.failureId).not.toBe('client-forged-id')
    expect(stamped.agentLaunchFailure?.occurredAt).not.toBe(42)
  })

  it('preserves the run failure when the field is absent', () => {
    const result: AutomationDispatchResult = { runId: 'run-1', status: 'dispatched' }

    const stamped = stampAutomationDispatchLaunchFailure(result)

    expect('agentLaunchFailure' in stamped).toBe(false)
  })

  it('clears the failure when the field is present and null', () => {
    const result: AutomationDispatchResult = {
      runId: 'run-1',
      status: 'completed',
      agentLaunchFailure: null
    }

    const stamped = stampAutomationDispatchLaunchFailure(result)

    expect('agentLaunchFailure' in stamped).toBe(true)
    expect(stamped.agentLaunchFailure).toBeNull()
  })
})
