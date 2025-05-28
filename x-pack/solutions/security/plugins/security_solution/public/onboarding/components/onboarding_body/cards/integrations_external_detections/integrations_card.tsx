/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CenteredLoadingSpinner } from '../../../../../common/components/centered_loading_spinner';
import { INTEGRATION_TABS } from './integration_tabs_configs';
import { ManageIntegrationsCallout } from '../common/integrations/callouts/manage_integrations_callout';
import { useOnboardingContext } from '../../../onboarding_context';
import { useEnhancedIntegrationCards } from '../../../../../common/lib/search_ai_lake/hooks';
import type {
  IntegrationCardMetadata,
  RenderChildrenType,
} from '../../../../../common/lib/integrations/types';
import { WithFilteredIntegrations } from '../../../../../common/lib/integrations/components/with_filtered_integrations';
import { IntegrationsCardGridTabsComponent } from '../../../../../common/lib/integrations/components/integration_card_grid_tabs_component';
import { DEFAULT_CHECK_COMPLETE_METADATA } from '../../../../../common/lib/integrations/components/integration_card_grid_tabs';
import { IntegrationContextProvider } from '../../../../../common/lib/integrations/hooks/integration_context';
import { ONBOARDING_PATH } from '../../../../../../common/constants';
import type { ExternalIntegrationCardMetadata } from './integrations_check_complete';

const IntegrationsCardGridTabs: RenderChildrenType = ({
  allowedIntegrations,
  availablePackagesResult,
  checkCompleteMetadata = DEFAULT_CHECK_COMPLETE_METADATA,
  selectedTabResult,
}) => {
  const { activeIntegrations, isAgentRequired } = checkCompleteMetadata;

  const { available: list } = useEnhancedIntegrationCards(allowedIntegrations, activeIntegrations, {
    showInstallationStatus: true,
    showCompressedInstallationStatus: true,
    returnPath: ONBOARDING_PATH,
  });
  const activeIntegrationsCount = activeIntegrations.length;
  return (
    <IntegrationsCardGridTabsComponent
      isAgentRequired={isAgentRequired}
      activeIntegrationsCount={activeIntegrationsCount}
      topCalloutRenderer={activeIntegrationsCount ? ManageIntegrationsCallout : undefined}
      integrationList={list}
      availablePackagesResult={availablePackagesResult}
      selectedTabResult={selectedTabResult}
      packageListGridOptions={{
        showCardLabels: true,
      }}
    />
  );
};

export const IntegrationsCard: OnboardingCardComponent<ExternalIntegrationCardMetadata> =
  React.memo(({ checkCompleteMetadata }) => {
    const {
      spaceId,
      telemetry: { reportLinkClick },
    } = useOnboardingContext();

    const checkExternalIntegrationsCompleteMetaData: IntegrationCardMetadata = useMemo(
      () => ({
        activeIntegrations: checkCompleteMetadata?.activeIntegrations ?? [],
        // There are a few agentless integrations featured, so we don't show the agent required callout.
        isAgentRequired: false,
      }),
      [checkCompleteMetadata?.activeIntegrations]
    );

    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner data-test-subj="loadingInstalledIntegrations" />;
    }

    return (
      <OnboardingCardContentPanel>
        <IntegrationContextProvider
          spaceId={spaceId}
          reportLinkClick={reportLinkClick}
          integrationTabs={INTEGRATION_TABS}
        >
          <WithFilteredIntegrations
            renderChildren={IntegrationsCardGridTabs}
            prereleaseIntegrationsEnabled={true}
            checkCompleteMetadata={checkExternalIntegrationsCompleteMetaData}
          />
        </IntegrationContextProvider>
      </OnboardingCardContentPanel>
    );
  });
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
