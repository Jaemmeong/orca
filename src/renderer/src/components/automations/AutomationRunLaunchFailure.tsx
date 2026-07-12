import { TriangleAlert } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { agentLaunchFailureMessage } from '@/lib/agent-launch-failure-copy'
import type { PersistedAgentLaunchFailure } from '../../../../shared/agent-launch-contract'

/** Display-only recovery card for an automation run whose agent launch failed
 *  or was left stranded. Renders the client-safe code+hint only (never argv/env/
 *  paths). The owner-authorized Forget affordance lands with its host RPC; until
 *  then this card exists so a stranded `dispatching + launch_state_unknown` run
 *  is distinguishable from one still in progress. */
export function AutomationRunLaunchFailure({
  failure,
  forgottenAt
}: {
  failure: PersistedAgentLaunchFailure
  forgottenAt: number | null
}): React.JSX.Element {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-4 flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-card-foreground"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <div className="font-medium">
          {translate(
            'agentLaunch.unattendedFailure.title.automation',
            "An automation's agent didn't start."
          )}
        </div>
        <div className="mt-0.5 text-muted-foreground">
          {agentLaunchFailureMessage(failure, 'post-create')}
        </div>
        {forgottenAt ? (
          <div className="mt-1 text-muted-foreground">
            {translate(
              'agentLaunch.unattendedFailure.forgotten',
              "You forgot this launch, so it won't run again."
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
