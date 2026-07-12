import { describe, expect, it, vi } from 'vitest'
import { BackgroundAgentLaunchStore } from './background-agent-launch-store'
import type { BackgroundAgentLaunchCreateInput } from './background-agent-launch-store'
import type { PersistedAgentLaunchFailure } from '../../shared/agent-launch-contract'

function createInput(
  overrides: Partial<BackgroundAgentLaunchCreateInput> = {}
): BackgroundAgentLaunchCreateInput {
  return {
    attemptId: 'attempt-1',
    worktreeId: 'repo-a::/srv/app',
    operationId: 'op-1',
    requestedAgent: 'codex',
    baseAgent: 'codex',
    ...overrides
  }
}

function failure(
  code: PersistedAgentLaunchFailure['code'],
  overrides: Partial<PersistedAgentLaunchFailure> = {}
): PersistedAgentLaunchFailure {
  return {
    code,
    requestedAgent: 'codex',
    baseAgent: 'codex',
    version: 1,
    failureId: `fail-${code}`,
    intent: 'background',
    occurredAt: 10,
    ...overrides
  }
}

describe('BackgroundAgentLaunchStore', () => {
  it('creates an attempt in pending before resolution and is idempotent on attemptId', () => {
    const store = new BackgroundAgentLaunchStore({ now: () => 1 })
    const created = store.create(createInput())
    expect(created).toMatchObject({ state: 'pending', failure: null, forgottenAt: null })
    // A replay of the same attempt id returns the existing record unchanged.
    const replay = store.create(createInput({ requestedAgent: 'claude' }))
    expect(replay.requestedAgent).toBe('codex')
    expect(store.all()).toHaveLength(1)
  })

  it('settles launched, clearing any prior failure', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    store.settleFailed('attempt-1', failure('spawn_failed'))
    store.settleLaunched('attempt-1')
    expect(store.get('attempt-1')).toMatchObject({ state: 'launched', failure: null })
  })

  it('settles failed with the durable code+hint failure', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    store.settleFailed('attempt-1', failure('spawn_failed'))
    expect(store.get('attempt-1')).toMatchObject({
      state: 'failed',
      failure: { code: 'spawn_failed' }
    })
  })

  it('markUnknown keeps the attempt pending and coexists with the unknown failure', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    store.markUnknown('attempt-1', failure('launch_state_unknown'))
    const attempt = store.get('attempt-1')
    expect(attempt?.state).toBe('pending')
    expect(attempt?.failure?.code).toBe('launch_state_unknown')
  })

  it('keeps the launch_state_unknown failureId stable across reconcile re-runs', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    store.markUnknown('attempt-1', failure('launch_state_unknown', { failureId: 'first' }))
    store.markUnknown('attempt-1', failure('launch_state_unknown', { failureId: 'second' }))
    // A churning failureId would reset the client's expectedFailureId guard.
    expect(store.get('attempt-1')?.failure?.failureId).toBe('first')
  })

  it('forgets only from launch_state_unknown, retaining the failure and stamping forgottenAt', () => {
    const store = new BackgroundAgentLaunchStore({ now: () => 77 })
    store.create(createInput())
    // Cannot forget a plain pending attempt (no unknown failure).
    expect(store.forget('attempt-1')).toBe(false)
    store.markUnknown('attempt-1', failure('launch_state_unknown'))
    expect(store.forget('attempt-1')).toBe(true)
    expect(store.get('attempt-1')).toMatchObject({
      state: 'forgotten',
      forgottenAt: 77,
      failure: { code: 'launch_state_unknown' }
    })
    // A second forget is a no-op (no longer unknown).
    expect(store.forget('attempt-1')).toBe(false)
  })

  it('cannot forget a failed (not unknown) attempt', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    store.settleFailed('attempt-1', failure('spawn_failed'))
    expect(store.forget('attempt-1')).toBe(false)
  })

  it('projects attempts filtered to a worktree', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput({ attemptId: 'a', worktreeId: 'wt-1' }))
    store.create(createInput({ attemptId: 'b', worktreeId: 'wt-1' }))
    store.create(createInput({ attemptId: 'c', worktreeId: 'wt-2' }))
    expect(store.listForWorktree('wt-1').map((a) => a.attemptId)).toEqual(['a', 'b'])
  })

  it('exposes referenced requested agents including forgotten attempts', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput({ attemptId: 'a', requestedAgent: 'custom-agent:codex:1' }))
    store.markUnknown('a', failure('launch_state_unknown'))
    store.forget('a')
    expect(store.referencedRequestedAgents()).toContain('custom-agent:codex:1')
  })

  it('drives the durable sink on every mutation and rebuilds without writing back', () => {
    const sink = vi.fn()
    const store = new BackgroundAgentLaunchStore()
    store.setDurablePersistence(sink)
    store.create(createInput())
    store.settleFailed('attempt-1', failure('spawn_failed'))
    expect(sink).toHaveBeenCalledTimes(2)
    const snapshot = store.durableState()

    const rebuilt = new BackgroundAgentLaunchStore()
    const rebuiltSink = vi.fn()
    rebuilt.setDurablePersistence(rebuiltSink)
    rebuilt.rebuildFrom(snapshot.attempts)
    // Rehydrate must not echo back into the sink.
    expect(rebuiltSink).not.toHaveBeenCalled()
    expect(rebuilt.get('attempt-1')?.state).toBe('failed')
  })

  it('persistenceForAttempt binds the reconcile slice to one attempt', () => {
    const store = new BackgroundAgentLaunchStore()
    store.create(createInput())
    const persistence = store.persistenceForAttempt('attempt-1')
    persistence.markUnknown(failure('launch_state_unknown'))
    expect(store.get('attempt-1')?.failure?.code).toBe('launch_state_unknown')
    persistence.settleLaunched()
    expect(store.get('attempt-1')?.state).toBe('launched')
  })
})
