// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AutomationRunLaunchFailure } from './AutomationRunLaunchFailure'
import type { PersistedAgentLaunchFailure } from '../../../../shared/agent-launch-contract'

function failure(
  overrides: Partial<PersistedAgentLaunchFailure> = {}
): PersistedAgentLaunchFailure {
  return {
    version: 1,
    failureId: 'failure-1',
    intent: 'automation',
    occurredAt: 1,
    code: 'launch_state_unknown',
    ...overrides
  }
}

afterEach(() => cleanup())

describe('AutomationRunLaunchFailure', () => {
  it('renders the automation-intent title and the client-safe code hint', () => {
    render(<AutomationRunLaunchFailure failure={failure()} forgottenAt={null} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText("An automation's agent didn't start.")).toBeTruthy()
    expect(
      screen.getByText('The launch status is unknown. Check the terminal before retrying.')
    ).toBeTruthy()
  })

  it('maps each failure code to its own hint copy', () => {
    render(<AutomationRunLaunchFailure failure={failure({ code: 'custom_agent_disabled' })} forgottenAt={null} />)
    expect(
      screen.getByText('This agent is turned off. Enable it in Settings to launch it.')
    ).toBeTruthy()
  })

  it('omits the forgotten note until the run is explicitly forgotten', () => {
    render(<AutomationRunLaunchFailure failure={failure()} forgottenAt={null} />)
    expect(screen.queryByText("You forgot this launch, so it won't run again.")).toBeNull()
  })

  it('shows the forgotten note when the run was forgotten', () => {
    render(<AutomationRunLaunchFailure failure={failure()} forgottenAt={42} />)
    expect(screen.getByText("You forgot this launch, so it won't run again.")).toBeTruthy()
  })
})
