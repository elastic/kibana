/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeAction } from '../../shared/components/take_action';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import type { AgentIdentity } from '../../../../entity_analytics/components/ai_security/types';

const quoted = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** KQL for the install's own events: its three identity fields. */
export const buildAgentTimelineQuery = ({ agentName, hostId, userName }: AgentIdentity): string =>
  [
    `process.ai_agent.name: ${quoted(agentName)}`,
    `host.id: ${quoted(hostId)}`,
    `user.name: ${quoted(userName)}`,
  ].join(' and ');

/** Footer for the AI agent flyout: Take action with "Investigate in Timeline", as on hosts and users. */
export const Footer = memo(({ identity }: { identity: AgentIdentity }) => {
  const isInSecurityApp = useIsInSecurityApp();
  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <TakeAction isDisabled={!isInSecurityApp} kqlQuery={buildAgentTimelineQuery(identity)} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
Footer.displayName = 'Footer';
