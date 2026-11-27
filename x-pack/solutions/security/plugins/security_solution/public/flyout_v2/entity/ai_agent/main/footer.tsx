/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from '../../shared/components/take_action';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { useKibana } from '../../../../common/lib/kibana';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { ENTITY_PROMPT } from '../../../../agent_builder/components/prompts';
import type { AgentSession } from '../../../../entity_analytics/components/ai_security/activity/types';
import type {
  AgentIdentity,
  AgentRow,
} from '../../../../entity_analytics/components/ai_security/types';
import { buildAgentEntityAttachment } from './chat_attachments';
import { useKillProcessItems } from './hooks/use_kill_process_items';

const quoted = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** KQL for the install's own events: its three identity fields. */
export const buildAgentTimelineQuery = ({ agentName, hostId, userName }: AgentIdentity): string =>
  [
    `process.ai_agent.name: ${quoted(agentName)}`,
    `host.id: ${quoted(hostId)}`,
    `user.name: ${quoted(userName)}`,
  ].join(' and ');

export interface FooterProps {
  readonly identity: AgentIdentity;
  readonly agent?: AgentRow;
  /** Sessions whose root process is running now, offered to Kill process. */
  readonly runningSessions?: readonly AgentSession[];
}

const NO_SESSIONS: readonly AgentSession[] = [];

/**
 * Footer for the AI agent flyout, as on hosts and users: "Add to chat" with the agent attached, and
 * Take action with "Investigate in Timeline" and Kill process for a running session.
 */
export const Footer = memo(({ identity, agent, runningSessions = NO_SESSIONS }: FooterProps) => {
  const isInSecurityApp = useIsInSecurityApp();
  const { agentBuilder } = useKibana().services;
  const killProcessItems = useKillProcessItems(runningSessions);

  const onAddToChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: ENTITY_PROMPT,
      attachments: [buildAgentEntityAttachment(identity, agent)],
      sessionTag: 'security',
    });
  }, [agentBuilder, agent, identity]);

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <NewAgentBuilderAttachment
          onClick={onAddToChat}
          iconType="addToChat"
          telemetry={{ pathway: 'entity_flyout', attachments: ['entity'] }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TakeAction
          isDisabled={!isInSecurityApp}
          kqlQuery={buildAgentTimelineQuery(identity)}
          additionalItems={killProcessItems}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
Footer.displayName = 'Footer';
