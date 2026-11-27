/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT } from '../../../../../agent_builder/components/translations';
import type { AgentRun } from '../../../../../entity_analytics/components/ai_security/activity/types';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../../entity_analytics/components/ai_security/types';
import {
  buildRunChatAttachments,
  RUN_QUESTION_MESSAGES,
  type RunQuestionId,
} from '../chat_attachments';
import { AI_AGENT_TEST_IDS } from '../test_ids';

const ASK_AI = i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAgent.askAi.button', {
  defaultMessage: 'Ask AI',
});

const ASK_AI_ABOUT_RUN = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAgent.askAi.popoverLabel',
  { defaultMessage: 'Ask AI about this run' }
);

const QUESTIONS: ReadonlyArray<{ id: RunQuestionId; label: string }> = [
  {
    id: 'unrequestedActions',
    label: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.askAi.unrequestedActions',
      { defaultMessage: "What did this run do that the prompt didn't ask for?" }
    ),
  },
  {
    id: 'promptInjection',
    label: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.askAi.promptInjection',
      { defaultMessage: 'Is there evidence of prompt injection?' }
    ),
  },
  {
    id: 'outsideReach',
    label: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.askAi.outsideReach',
      { defaultMessage: 'What did it touch outside its working directory?' }
    ),
  },
];

export interface AskAiAboutRunProps {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  readonly run: AgentRun;
}

/**
 * "Ask AI" in a run header: three set questions, each opening a new Agent Builder chat with the
 * agent, the run's alerts and the run's steps attached. Hidden when the agent chat experience isn't
 * available, or when the investigation timeline attachment isn't registered.
 */
export const AskAiAboutRun = memo(({ identity, agent, run }: AskAiAboutRunProps) => {
  const { agentBuilder } = useKibana().services;
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const isTimelineAttachmentRegistered = useIsExperimentalFeatureEnabled(
    'endpointForensicAnalysisSkill'
  );
  const reportAddToChat = useReportAddToChat();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'aiAgentAskAiAboutRun' });

  const ask = useCallback(
    (question: RunQuestionId) => {
      setIsOpen(false);
      reportAddToChat({
        pathway: 'entity_flyout',
        attachments: run.alertIds.length > 0 ? ['entity', 'alert'] : ['entity'],
      });
      agentBuilder?.openChat({
        newConversation: true,
        autoSendInitialMessage: true,
        initialMessage: RUN_QUESTION_MESSAGES[question],
        attachments: buildRunChatAttachments(identity, agent, run),
        sessionTag: 'security',
      });
    },
    [agentBuilder, agent, identity, reportAddToChat, run]
  );

  if (
    !hasAgentBuilderPrivilege ||
    !isAgentChatExperienceEnabled ||
    !isTimelineAttachmentRegistered ||
    !agentBuilder?.openChat
  ) {
    return null;
  }

  const button = (
    <AiButton
      variant="empty"
      size="xs"
      iconType="sparkles"
      isDisabled={!hasValidAgentBuilderLicense}
      onClick={() => setIsOpen((open) => !open)}
      aria-label={ASK_AI}
      data-test-subj={AI_AGENT_TEST_IDS.askAi}
    >
      {ASK_AI}
    </AiButton>
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={ASK_AI_ABOUT_RUN}
      button={
        hasValidAgentBuilderLicense ? (
          button
        ) : (
          <EuiToolTip content={UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT}>
            {button}
          </EuiToolTip>
        )
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel
        size="s"
        items={QUESTIONS.map(({ id, label }) => (
          <EuiContextMenuItem
            key={id}
            onClick={() => ask(id)}
            data-test-subj={`${AI_AGENT_TEST_IDS.askAi}-${id}`}
          >
            {label}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
});
AskAiAboutRun.displayName = 'AskAiAboutRun';
