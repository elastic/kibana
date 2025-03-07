/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import React from 'react';
import { OnboardingContextProvider } from '../../../../onboarding/components/onboarding_context';
import { IntegrationsCardGridTabs } from '../../../../onboarding/components/onboarding_body/cards/integrations/integration_card_grid_tabs';
import { LOCAL_STORAGE_ASSET_INVENTORY_ENABLED_CALLOUT_KEY } from '../../../constants';

export const useNoDataFound = () => {
  const [isCalloutVisible, setIsCalloutVisible] = useLocalStorage<boolean>(
    LOCAL_STORAGE_ASSET_INVENTORY_ENABLED_CALLOUT_KEY,
    true
  );

  const onHideCallout = () => setIsCalloutVisible(false);

  const renderIntegrationsExplorer = (spaceId: string) => {
    return (
      <OnboardingContextProvider spaceId={spaceId}>
        <IntegrationsCardGridTabs installedIntegrationsCount={0} isAgentRequired={false} />
      </OnboardingContextProvider>
    );
  };

  return {
    isCalloutVisible,
    onHideCallout,
    renderIntegrationsExplorer,
  };
};
