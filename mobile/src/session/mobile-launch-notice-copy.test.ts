import { describe, expect, it } from 'vitest'
import type { AgentLaunchNotice } from '../../../src/shared/agent-launch-contract'
import { AGENT_LAUNCH_NOTICE_CODES } from '../../../src/shared/agent-launch-notice-schema'
import { mobileLaunchNoticeTier, resolveMobileLaunchNoticeText } from './mobile-launch-notice-copy'

describe('mobile launch notice copy', () => {
  it('resolves honest fallback copy naming the requested label and stock base', () => {
    expect(
      resolveMobileLaunchNoticeText({
        code: 'missing_custom_fallback',
        label: 'My Codex',
        baseAgent: 'codex'
      })
    ).toBe(
      'My Codex was deleted. Started stock Codex with no custom executable, custom arguments, or custom agent environment.'
    )
    expect(
      resolveMobileLaunchNoticeText({
        code: 'disabled_custom_fallback',
        label: 'My MiMo',
        baseAgent: 'mimo-code'
      })
    ).toBe(
      'My MiMo is disabled. Started stock MiMo Code with no custom executable, custom arguments, or custom agent environment.'
    )
  })

  it('resolves the paired env-withheld copy against the requested label', () => {
    expect(resolveMobileLaunchNoticeText({ code: 'env_withheld', label: 'My Claude' })).toBe(
      "This launch didn't use all of My Claude's environment values. Manage paired-launch env on the desktop host."
    )
  })

  it('resolves value-neutral snapshot copy', () => {
    expect(resolveMobileLaunchNoticeText({ code: 'snapshot_definition_changed', label: 'x' })).toBe(
      'Resumed with the settings saved when this session started.'
    )
  })

  it('classifies snapshot_definition_changed as a chip and the rest as banners', () => {
    expect(mobileLaunchNoticeTier({ code: 'snapshot_definition_changed', label: 'x' })).toBe('chip')
    expect(mobileLaunchNoticeTier({ code: 'env_withheld', label: 'x' })).toBe('banner')
    expect(
      mobileLaunchNoticeTier({ code: 'missing_custom_fallback', label: 'x', baseAgent: 'codex' })
    ).toBe('banner')
    expect(
      mobileLaunchNoticeTier({ code: 'disabled_custom_fallback', label: 'x', baseAgent: 'codex' })
    ).toBe('banner')
  })

  it('produces non-empty copy for every notice code in the shared enum', () => {
    // Drop-nothing: fails if a new notice code is added to the shared union
    // without mobile copy, since the switch would return undefined.
    const sample = (code: (typeof AGENT_LAUNCH_NOTICE_CODES)[number]): AgentLaunchNotice =>
      code === 'missing_custom_fallback' || code === 'disabled_custom_fallback'
        ? { code, label: 'Agent', baseAgent: 'codex' }
        : { code, label: 'Agent' }
    for (const code of AGENT_LAUNCH_NOTICE_CODES) {
      expect(resolveMobileLaunchNoticeText(sample(code)).length).toBeGreaterThan(0)
    }
  })
})
