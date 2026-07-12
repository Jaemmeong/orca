import { useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import { getWorktreeMapFromState } from '@/store/selectors'
import { useConfirmationDialog } from '@/components/confirmation-dialog'
import { AgentLaunchRecoveryCard } from './AgentLaunchRecoveryCard'
import { forgetLaunchConfirmation } from '@/lib/agent-launch-recovery-action-copy'
import {
  AGENTS_SETTINGS_ACTIONS,
  RETRY_SAME_ACTIONS
} from '@/lib/agent-launch-recovery-action-dispatch'
import type { AgentLaunchRecoveryActionId } from '@/lib/agent-launch-recovery-card'
import type { AgentLaunchRecoveryLiveness } from '@/lib/agent-launch-recovery-card'

/** Connected recovery card for a post-create agent-launch failure. Reads the
 *  durable failure from the workspace's WorktreeMeta mirror and renders nothing
 *  until the host records one. Retry/Forget are fully wired here; the host's
 *  worktrees:changed notification reconciles launched/failed back into the meta,
 *  so this component holds no failure state of its own. */
export function AgentLaunchRecoveryCardContainer({
  worktreeId
}: {
  worktreeId: string
}): React.JSX.Element | null {
  const failure = useAppStore(
    (s) => getWorktreeMapFromState(s).get(worktreeId)?.agentLaunchFailure ?? null
  )
  const pendingOperationId = useAppStore(
    (s) => getWorktreeMapFromState(s).get(worktreeId)?.pendingAgentLaunch?.operationId ?? null
  )
  const retryWorktreeAgentLaunch = useAppStore((s) => s.retryWorktreeAgentLaunch)
  const forgetWorktreeAgentLaunch = useAppStore((s) => s.forgetWorktreeAgentLaunch)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  const openModal = useAppStore((s) => s.openModal)
  const confirm = useConfirmationDialog()
  const [busy, setBusy] = useState(false)

  const onAction = useCallback(
    async (id: AgentLaunchRecoveryActionId) => {
      if (!failure) {
        return
      }
      if (RETRY_SAME_ACTIONS.has(id)) {
        setBusy(true)
        try {
          await retryWorktreeAgentLaunch({
            worktreeId,
            expectedFailureId: failure.failureId,
            action: { kind: 'retry-same' }
          })
        } finally {
          setBusy(false)
        }
        return
      }
      if (id === 'forget-launch') {
        // The pending operation id is the anti-race guard the host requires; a
        // missing one means reconciliation already cleared the pending, so there
        // is nothing to forget.
        if (!pendingOperationId) {
          return
        }
        // Forget cannot stop a possibly-live remote process (plan :498), so it is
        // gated behind an explicit destructive confirmation carrying that warning.
        if (!(await confirm(forgetLaunchConfirmation()))) {
          return
        }
        setBusy(true)
        try {
          await forgetWorktreeAgentLaunch({ worktreeId, expectedOperationId: pendingOperationId })
        } finally {
          setBusy(false)
        }
        return
      }
      if (AGENTS_SETTINGS_ACTIONS.has(id)) {
        // Repair/selection recovery lives in the desktop-host agents settings; a
        // live in-card picker for change-agent is future authoring UI (U8).
        openSettingsTarget({ pane: 'agents', repoId: null })
        return
      }
      if (id === 'reconnect' || id === 'reconnect-securely') {
        openSettingsTarget({ pane: 'ssh', repoId: null })
        return
      }
      if (id === 'recover-capacity') {
        // The summary is principal-scoped host-side, so no target is passed here;
        // the local runtime aggregates the local principal's rows across hosts.
        openModal('agent-launch-capacity-recovery')
      }
      // open-terminal routes to an affordance not owned by this wave; the
      // no-op keeps the card honest rather than firing a wrong action.
    },
    [
      failure,
      pendingOperationId,
      worktreeId,
      confirm,
      retryWorktreeAgentLaunch,
      forgetWorktreeAgentLaunch,
      openSettingsTarget,
      openModal
    ]
  )

  if (!failure) {
    return null
  }
  // Liveness dominates the code, but the only liveness the renderer can derive
  // from the durable record is the provider-disconnected `launch_state_unknown`;
  // a live-but-unattributed terminal is host-reconciliation state (U6) with no
  // persisted failure, so it never reaches this card.
  const liveness: AgentLaunchRecoveryLiveness =
    failure.code === 'launch_state_unknown' ? 'unknown' : 'idle'

  return (
    <AgentLaunchRecoveryCard
      failure={failure}
      liveness={liveness}
      busy={busy}
      onAction={onAction}
    />
  )
}
