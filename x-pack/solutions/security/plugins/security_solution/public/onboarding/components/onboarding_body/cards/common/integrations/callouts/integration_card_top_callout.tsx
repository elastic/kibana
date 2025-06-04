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
import { InstalledIntegrationsCallout } from './installed_integrations_callout';
import { EndpointCallout } from './endpoint_callout';
import { IntegrationTabId } from '../../../../../../../common/lib/integrations/types';

export const useShowInstalledCallout = ({
  installedIntegrationsCount,
  isAgentRequired,
}: {
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
}) => {
  return installedIntegrationsCount > 0 || isAgentRequired;
};

export const IntegrationCardTopCalloutComponent: React.FC<{
  installedIntegrationsCount: number;
  isAgentRequired: boolean;
  selectedTabId: IntegrationTabId;
}> = ({ installedIntegrationsCount, isAgentRequired, selectedTabId }) => {
  const { isAgentlessAvailable$ } = useOnboardingService();
  const isAgentlessAvailable = useObservable(isAgentlessAvailable$, undefined);
  const showInstalledCallout = useShowInstalledCallout({
    installedIntegrationsCount,
    isAgentRequired,
  });
  const showAgentlessCallout =
    isAgentlessAvailable &&
    installedIntegrationsCount === 0 &&
    selectedTabId !== IntegrationTabId.endpoint;
  const showEndpointCallout =
    installedIntegrationsCount === 0 && selectedTabId === IntegrationTabId.endpoint;

  if (!showAgentlessCallout && !showEndpointCallout && !showInstalledCallout) {
    return null;
  }

  return (
    <>
      {showEndpointCallout && <EndpointCallout />}
      {showAgentlessCallout && <AgentlessAvailableCallout />}
      {showInstalledCallout && (
        <InstalledIntegrationsCallout
          isAgentRequired={isAgentRequired}
          installedIntegrationsCount={installedIntegrationsCount}
        />
      )}
    </>
  );
};

export const IntegrationCardTopCallout = React.memo(IntegrationCardTopCalloutComponent);

IntegrationCardTopCallout.displayName = 'IntegrationCardTopCallout';
