// Localized labels and destructive classification for agent-launch recovery
// actions. Shared by the interactive above-terminal recovery card and the compact
// sidebar unattended-failure card so both surfaces render one action vocabulary.

import { translate } from '@/i18n/i18n'
import type { AgentLaunchRecoveryActionId } from '@/lib/agent-launch-recovery-card'

/** Localized button label for a recovery action. */
export function recoveryActionLabel(id: AgentLaunchRecoveryActionId): string {
  switch (id) {
    case 'retry':
      return translate('auto.components.AgentLaunchRecoveryCard.retry', 'Retry')
    case 'retry-current-settings':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.retryCurrentSettings',
        'Retry with current settings'
      )
    case 'launch-current-settings':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.launchCurrentSettings',
        'Launch with current settings'
      )
    case 'choose-agent':
      return translate('auto.components.AgentLaunchRecoveryCard.chooseAgent', 'Choose agent')
    case 'edit-agent-settings':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.editAgentSettings',
        'Edit agent settings'
      )
    case 'repair-on-host':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.repairOnHost',
        'Repair on desktop host'
      )
    case 'reconnect-securely':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.reconnectSecurely',
        'Reconnect securely'
      )
    case 'reconnect':
      return translate('auto.components.AgentLaunchRecoveryCard.reconnect', 'Reconnect')
    case 'recover-capacity':
      return translate(
        'auto.components.AgentLaunchRecoveryCard.recoverCapacity',
        'Recover launch capacity…'
      )
    case 'open-terminal':
      return translate('auto.components.AgentLaunchRecoveryCard.openTerminal', 'Open terminal')
    case 'forget-launch':
      return translate('auto.components.AgentLaunchRecoveryCard.forgetLaunch', 'Forget launch…')
    case 'manage-agents':
      return translate('auto.components.AgentLaunchRecoveryCard.manageAgents', 'Manage agents')
  }
}

/** Forget is a destructive confirmation; every other action is safe. */
export function isDestructiveRecoveryAction(id: AgentLaunchRecoveryActionId): boolean {
  return id === 'forget-launch'
}
