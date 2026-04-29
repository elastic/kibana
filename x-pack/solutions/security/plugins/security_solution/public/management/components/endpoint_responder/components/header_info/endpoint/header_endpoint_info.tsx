/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { getHostPlatform } from '../../../../../../common/lib/endpoint/utils/get_host_platform';
import { AgentStatus } from '../../../../../../common/components/endpoint/agents/agent_status';
import { HeaderAgentInfo } from '../header_agent_info';
import { useGetEndpointDetails } from '../../../../../hooks';
import type { Platform } from '../platforms';

interface HeaderEndpointInfoProps {
  endpointId: string;
}

export const HeaderEndpointInfo = memo<HeaderEndpointInfoProps>(({ endpointId }) => {
  const { data: endpointDetails, isLoading } = useGetEndpointDetails(endpointId, {
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <EuiSkeletonText lines={2} />;
  }

  if (!endpointDetails) {
    return null;
  }

  return (
    <HeaderAgentInfo
      platform={getHostPlatform(endpointDetails.metadata) as Platform}
      hostName={endpointDetails.metadata.host.name}
      lastCheckin={endpointDetails.last_checkin}
      agentType="endpoint"
      data-test-subj="responseConsole"
    >
      <AgentStatus
        agentId={endpointId}
        agentType="endpoint"
        data-test-subj="responderHeaderEndpointAgentIsolationStatus"
      />
    </HeaderAgentInfo>
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
