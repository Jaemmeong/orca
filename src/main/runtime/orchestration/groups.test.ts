import { describe, expect, it } from 'vitest'
import { isGroupAddress, resolveGroupAddress } from './groups'
import type { RuntimeTerminalSummary } from '../../../shared/runtime-types'

function makeSummary(
  handle: string,
  opts: Partial<RuntimeTerminalSummary> = {}
): RuntimeTerminalSummary {
  return {
    handle,
    ptyId: opts.ptyId ?? handle,
    worktreeId: opts.worktreeId ?? 'wt_default',
    worktreePath: opts.worktreePath ?? '/tmp/wt',
    branch: opts.branch ?? 'main',
    tabId: opts.tabId ?? 'tab_1',
    leafId: opts.leafId ?? handle,
    title: opts.title ?? null,
    connected: opts.connected ?? true,
    writable: opts.writable ?? true,
    lastOutputAt: opts.lastOutputAt ?? null,
    preview: opts.preview ?? '',
    ...(opts.requestedAgent !== undefined ? { requestedAgent: opts.requestedAgent } : {}),
    ...(opts.baseAgent !== undefined ? { baseAgent: opts.baseAgent } : {})
  }
}

const noStatus = () => null

describe('isGroupAddress', () => {
  it('returns true for @-prefixed addresses', () => {
    expect(isGroupAddress('@all')).toBe(true)
    expect(isGroupAddress('@idle')).toBe(true)
    expect(isGroupAddress('@claude')).toBe(true)
    expect(isGroupAddress('@droid')).toBe(true)
    expect(isGroupAddress('@worktree:wt_1')).toBe(true)
  })

  it('returns false for regular handles', () => {
    expect(isGroupAddress('term_abc')).toBe(false)
    expect(isGroupAddress('coordinator')).toBe(false)
    expect(isGroupAddress('')).toBe(false)
  })
})

describe('resolveGroupAddress', () => {
  it('returns the address as-is for non-group addresses', () => {
    const result = resolveGroupAddress('term_b', 'term_a', [], noStatus)
    expect(result).toEqual(['term_b'])
  })

  describe('@all', () => {
    it('returns all terminals except sender', () => {
      const terminals = [makeSummary('term_a'), makeSummary('term_b'), makeSummary('term_c')]
      const result = resolveGroupAddress('@all', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b', 'term_c'])
    })

    it('returns empty when sender is the only terminal', () => {
      const terminals = [makeSummary('term_a')]
      const result = resolveGroupAddress('@all', 'term_a', terminals, noStatus)
      expect(result).toEqual([])
    })
  })

  describe('@idle', () => {
    it('returns only idle terminals', () => {
      const terminals = [makeSummary('term_a'), makeSummary('term_b'), makeSummary('term_c')]
      const getStatus = (h: string) => (h === 'term_b' ? 'idle' : 'busy')
      const result = resolveGroupAddress('@idle', 'term_a', terminals, getStatus)
      expect(result).toEqual(['term_b'])
    })

    it('excludes sender even if idle', () => {
      const terminals = [makeSummary('term_a'), makeSummary('term_b')]
      const getStatus = () => 'idle'
      const result = resolveGroupAddress('@idle', 'term_a', terminals, getStatus)
      expect(result).toEqual(['term_b'])
    })
  })

  describe('@worktree:<id>', () => {
    it('returns terminals in the specified worktree', () => {
      const terminals = [
        makeSummary('term_a', { worktreeId: 'wt_1' }),
        makeSummary('term_b', { worktreeId: 'wt_1' }),
        makeSummary('term_c', { worktreeId: 'wt_2' })
      ]
      const result = resolveGroupAddress('@worktree:wt_1', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b'])
    })

    it('returns empty for nonexistent worktree', () => {
      const terminals = [makeSummary('term_a', { worktreeId: 'wt_1' })]
      const result = resolveGroupAddress('@worktree:wt_99', 'term_a', terminals, noStatus)
      expect(result).toEqual([])
    })
  })

  describe('agent name groups', () => {
    it('matches @claude by validated base attribution, not title', () => {
      const terminals = [
        makeSummary('term_a', { baseAgent: 'claude' }),
        makeSummary('term_b', { baseAgent: 'claude' }),
        makeSummary('term_c', { baseAgent: 'codex' })
      ]
      const result = resolveGroupAddress('@claude', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b'])
    })

    it('maps the mimo-code base to the @mimo group', () => {
      const terminals = [
        makeSummary('term_a', { baseAgent: 'mimo-code' }),
        makeSummary('term_b', { baseAgent: 'mimo-code' }),
        makeSummary('term_c', { baseAgent: 'opencode' })
      ]
      const result = resolveGroupAddress('@mimo', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b'])
    })

    it('a custom agent joins its base harness group', () => {
      // The summary builder resolves a custom requestedAgent to its base; the
      // custom terminal is addressable under the base group.
      const terminals = [
        makeSummary('term_a', { baseAgent: 'claude' }),
        makeSummary('term_b', {
          requestedAgent: 'custom-agent:claude:01234567-89ab-4cde-8f01-23456789abcd',
          baseAgent: 'claude'
        })
      ]
      const result = resolveGroupAddress('@claude', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b'])
    })

    it('keeps openclaude and claude as distinct groups', () => {
      const terminals = [
        makeSummary('term_a', { baseAgent: 'claude' }),
        makeSummary('term_b', { baseAgent: 'openclaude' })
      ]
      expect(resolveGroupAddress('@claude', 'term_a', terminals, noStatus)).toEqual([])
      expect(resolveGroupAddress('@openclaude', 'term_a', terminals, noStatus)).toEqual(['term_b'])
    })

    it('omits an unattributed terminal rather than guessing from its title', () => {
      // A title that reads like an agent name must NOT join the group without
      // validated base attribution (U6 coordinator terminals rely on this).
      const terminals = [
        makeSummary('term_a', { baseAgent: 'claude' }),
        makeSummary('term_b', { title: 'Claude Code' })
      ]
      const result = resolveGroupAddress('@claude', 'term_a', terminals, noStatus)
      expect(result).toEqual([])
    })

    it('matches @droid by base and excludes the sender', () => {
      const terminals = [
        makeSummary('term_a', { baseAgent: 'droid' }),
        makeSummary('term_b', { baseAgent: 'droid' }),
        makeSummary('term_c', { baseAgent: 'droid' })
      ]
      const result = resolveGroupAddress('@droid', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b', 'term_c'])
    })

    it('does not map bases without an addressable group', () => {
      // 'autohand' has no agent-name group; it is unreachable via base groups.
      const terminals = [
        makeSummary('term_a', { baseAgent: 'claude' }),
        makeSummary('term_b', { baseAgent: 'autohand' })
      ]
      expect(resolveGroupAddress('@claude', 'term_a', terminals, noStatus)).toEqual([])
    })

    it('is case-insensitive for the group address', () => {
      const terminals = [
        makeSummary('term_a', { baseAgent: 'codex' }),
        makeSummary('term_b', { baseAgent: 'claude' })
      ]
      const result = resolveGroupAddress('@Claude', 'term_a', terminals, noStatus)
      expect(result).toEqual(['term_b'])
    })
  })

  describe('unknown groups', () => {
    it('returns empty for unrecognized group', () => {
      const terminals = [makeSummary('term_a'), makeSummary('term_b')]
      const result = resolveGroupAddress('@unknown', 'term_a', terminals, noStatus)
      expect(result).toEqual([])
    })
  })
})
