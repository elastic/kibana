/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useOnboardingService } from '../../../../../hooks/use_onboarding_service';
import { AgentlessAvailableCallout } from './agentless_available_callout';
import { ActiveIntegrationsCallout } from './active_integrations_callout';
import { EndpointCallout } from './endpoint_callout';
import { IntegrationTabId } from '../../../../../../../common/lib/integrations/types';

export const IntegrationCardTopCallout = React.memo<{
  activeIntegrationsCount: number;
  isAgentRequired?: boolean;
  selectedTabId: IntegrationTabId;
}>(({ activeIntegrationsCount, isAgentRequired, selectedTabId }) => {
  const { isAgentlessAvailable$ } = useOnboardingService();
  const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);

  const showActiveCallout = activeIntegrationsCount > 0 || isAgentRequired;

  const showAgentlessCallout =
    isAgentlessAvailable &&
    activeIntegrationsCount === 0 &&
    selectedTabId !== IntegrationTabId.endpoint;

  const showEndpointCallout =
    activeIntegrationsCount === 0 && selectedTabId === IntegrationTabId.endpoint;

  if (!showAgentlessCallout && !showEndpointCallout && !showActiveCallout) {
    return null;
  }

  return (
    <>
      {showEndpointCallout && <EndpointCallout />}
      {showAgentlessCallout && <AgentlessAvailableCallout />}
      {showActiveCallout && (
        <ActiveIntegrationsCallout
          isAgentRequired={isAgentRequired}
          activeIntegrationsCount={activeIntegrationsCount}
        />
      )}
    </>
  );
});
IntegrationCardTopCallout.displayName = 'IntegrationCardTopCallout';
