/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GAP_IDS = {
  claudeOtelNotCollected: 'claude_otel_not_collected',
  claudePromptOptIn: 'claude_prompt_opt_in',
  defendHeadlessOnly: 'defend_headless_only',
  claudeSessionIdUnmapped: 'claude_session_id_unmapped',
  cursorNoSessionId: 'cursor_no_session_id',
  cursorNoPromptSource: 'cursor_no_prompt_source',
  noIdpData: 'no_idp_data',
  noMfaState: 'no_mfa_state',
  emailAfterSignIn: 'email_after_sign_in',
  noAgentStamp: 'no_agent_stamp',
  noAgentRisk: 'no_agent_risk',
  userRowsNoIdpStatus: 'user_rows_no_idp_status',
} as const;

export type GapId = (typeof GAP_IDS)[keyof typeof GAP_IDS];

/** A row of the PoC's collection gaps register, shown where its data is missing. */
export interface CollectionGap {
  readonly id: GapId;
  readonly title: string;
  readonly blocks: string;
  readonly status: string;
  readonly workaround: string;
}

/** Rows of `research/collection-gaps.md`, worded as they are there. */
export const COLLECTION_GAPS: Readonly<Record<GapId, CollectionGap>> = {
  [GAP_IDS.claudeOtelNotCollected]: {
    id: GAP_IDS.claudeOtelNotCollected,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeOtelNotCollected.title',
      {
        defaultMessage: 'Claude Code OTel did not reach the lab cluster',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeOtelNotCollected.blocks',
      {
        defaultMessage: 'Prompts, tool calls, tokens, model, OTel session ID',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeOtelNotCollected.status',
      {
        defaultMessage: 'Test accounts requested 26 November',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeOtelNotCollected.workaround',
      {
        defaultMessage: 'Generator --claude-otel, tagged poc-mock',
      }
    ),
  },
  [GAP_IDS.claudePromptOptIn]: {
    id: GAP_IDS.claudePromptOptIn,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudePromptOptIn.title',
      {
        defaultMessage: 'Claude prompt text is opt-in',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudePromptOptIn.blocks',
      {
        defaultMessage: 'What was asked, for interactive sessions',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudePromptOptIn.status',
      {
        defaultMessage: 'Confirm with the test accounts (OTEL_LOG_USER_PROMPTS)',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudePromptOptIn.workaround',
      {
        defaultMessage: 'Mock prompts',
      }
    ),
  },
  [GAP_IDS.defendHeadlessOnly]: {
    id: GAP_IDS.defendHeadlessOnly,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.defendHeadlessOnly.title',
      {
        defaultMessage: 'Defend only has the prompt for headless runs',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.defendHeadlessOnly.blocks',
      {
        defaultMessage: 'What was asked, for interactive sessions',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.defendHeadlessOnly.status',
      {
        defaultMessage: 'None, by design: an interactive launch is just the agent binary',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.defendHeadlessOnly.workaround',
      {
        defaultMessage: 'None needed',
      }
    ),
  },
  [GAP_IDS.claudeSessionIdUnmapped]: {
    id: GAP_IDS.claudeSessionIdUnmapped,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeSessionIdUnmapped.title',
      {
        defaultMessage: 'Defend Claude session ID unmapped in package 9.6.1',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeSessionIdUnmapped.blocks',
      {
        defaultMessage: 'Joining Defend to OTel, session grouping in ES|QL and rules',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeSessionIdUnmapped.status',
      {
        defaultMessage: 'Mapped in endpoint-package #820, 9.6 backport #825. Next package release',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.claudeSessionIdUnmapped.workaround',
      {
        defaultMessage: 'Runtime field, or the generator --map-session-id',
      }
    ),
  },
  [GAP_IDS.cursorNoSessionId]: {
    id: GAP_IDS.cursorNoSessionId,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoSessionId.title',
      {
        defaultMessage: 'No Cursor session ID in Defend',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoSessionId.blocks',
      {
        defaultMessage: 'Cursor session grouping',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoSessionId.status',
      {
        defaultMessage: 'Asked the Endpoint team 26 November',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoSessionId.workaround',
      {
        defaultMessage: 'Group by process tree',
      }
    ),
  },
  [GAP_IDS.cursorNoPromptSource]: {
    id: GAP_IDS.cursorNoPromptSource,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoPromptSource.title',
      {
        defaultMessage: 'No Cursor prompt or session data in any integration',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoPromptSource.blocks',
      {
        defaultMessage: 'What was asked, and tool calls, for Cursor',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoPromptSource.status',
      {
        defaultMessage: 'Vendor: the Cursor audit log holds admin events only',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.cursorNoPromptSource.workaround',
      {
        defaultMessage: 'None',
      }
    ),
  },
  [GAP_IDS.noIdpData]: {
    id: GAP_IDS.noIdpData,
    title: i18n.translate('xpack.securitySolution.entityAnalytics.aiAgents.gaps.noIdpData.title', {
      defaultMessage: 'No IdP data in the lab',
    }),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noIdpData.blocks',
      {
        defaultMessage: 'The person behind the agent, IdP status, MFA, watchlists',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noIdpData.status',
      {
        defaultMessage: 'Test IdP tenant, or org-data',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noIdpData.workaround',
      {
        defaultMessage: 'Generated IdP users',
      }
    ),
  },
  [GAP_IDS.noMfaState]: {
    id: GAP_IDS.noMfaState,
    title: i18n.translate('xpack.securitySolution.entityAnalytics.aiAgents.gaps.noMfaState.title', {
      defaultMessage: 'Okta and Entra ID integrations do not send MFA state',
    }),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noMfaState.blocks',
      {
        defaultMessage: 'The storyline MFA off',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noMfaState.status',
      {
        defaultMessage: 'Integration owners',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noMfaState.workaround',
      {
        defaultMessage: 'Mock field in the demo',
      }
    ),
  },
  [GAP_IDS.emailAfterSignIn]: {
    id: GAP_IDS.emailAfterSignIn,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.emailAfterSignIn.title',
      {
        defaultMessage: 'Account email only after sign-in, and only on the agent own events',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.emailAfterSignIn.blocks',
      {
        defaultMessage: 'Signed in as, account linking',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.emailAfterSignIn.status',
      {
        defaultMessage: 'Defend design',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.emailAfterSignIn.workaround',
      {
        defaultMessage: 'Read the email from the agent own events',
      }
    ),
  },
  [GAP_IDS.noAgentStamp]: {
    id: GAP_IDS.noAgentStamp,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentStamp.title',
      {
        defaultMessage: 'No agent ID stamp on alerts',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentStamp.blocks',
      {
        defaultMessage: 'Agent alerts, agent risk',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentStamp.status',
      {
        defaultMessage: 'Ours, demo plan workstream B',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentStamp.workaround',
      {
        defaultMessage: 'Prototype branch',
      }
    ),
  },
  [GAP_IDS.noAgentRisk]: {
    id: GAP_IDS.noAgentRisk,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentRisk.title',
      {
        defaultMessage: 'Risk scoring does not score ai_agent',
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentRisk.blocks',
      {
        defaultMessage: 'Agent risk',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentRisk.status',
      {
        defaultMessage: 'Ours, demo plan workstream B',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.noAgentRisk.workaround',
      {
        defaultMessage: 'Prototype branch',
      }
    ),
  },
  [GAP_IDS.userRowsNoIdpStatus]: {
    id: GAP_IDS.userRowsNoIdpStatus,
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.userRowsNoIdpStatus.title',
      {
        defaultMessage: "User entity rows don't keep IdP account status",
      }
    ),
    blocks: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.userRowsNoIdpStatus.blocks',
      {
        defaultMessage:
          'Facts about the person on the agent row, store-query watchlists on "deprovisioned", the orphaned agent',
      }
    ),
    status: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.userRowsNoIdpStatus.status',
      {
        defaultMessage:
          'Entity Analytics (ours): extract user.account.status.* or asset.status into the user definition',
      }
    ),
    workaround: i18n.translate(
      'xpack.securitySolution.entityAnalytics.aiAgents.gaps.userRowsNoIdpStatus.workaround',
      {
        defaultMessage: 'Watchlists from the HR index instead',
      }
    ),
  },
};

/** Where the full register lives, shown with each gap. */
export const GAPS_REGISTER_NAME = 'research/collection-gaps.md';
