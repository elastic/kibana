/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { OnboardingCardComponent } from '../../../../../types';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import { INTEGRATION_TABS } from './integration_tabs_configs';
import { ManageIntegrationsCallout } from '../../common/integrations/callouts/manage_integrations_callout';
import { useOnboardingContext } from '../../../../onboarding_context';
import { useEnhancedIntegrationCards } from '../../../../../../common/lib/search_ai_lake/hooks';
import { useSelectedTab } from '../../../../../../common/lib/integrations/hooks/use_selected_tab';
import type {
  RenderChildrenType,
  IntegrationCardMetadata,
} from '../../../../../../common/lib/integrations/types';
import { WithFilteredIntegrations } from '../../../../../../common/lib/integrations/components/with_filtered_integrations';
import { IntegrationsCardGridTabsComponent } from '../../../../../../common/lib/integrations/components/integration_card_grid_tabs_component';
import { DEFAULT_CHECK_COMPLETE_METADATA } from '../../../../../../common/lib/integrations/components/integration_card_grid_tabs';
import { IntegrationContextProvider } from '../../../../../../common/lib/integrations/hooks/integration_context';
import { ONBOARDING_PATH } from '../../../../../../../common/constants';

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
  const installedIntegrationsCount = activeIntegrations?.length ?? 0;
  return (
    <IntegrationsCardGridTabsComponent
      isAgentRequired={isAgentRequired}
      installedIntegrationsCount={installedIntegrationsCount}
      topCalloutRenderer={installedIntegrationsCount ? ManageIntegrationsCallout : undefined}
      integrationList={list}
      availablePackagesResult={availablePackagesResult}
      selectedTabResult={selectedTabResult}
      packageListGridOptions={{
        showCardLabels: true,
      }}
    />
  );
};

export const IntegrationsCard: OnboardingCardComponent<IntegrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata }) => {
    const {
      spaceId,
      telemetry: { trackLinkClick },
    } = useOnboardingContext();

    const selectedTabResult = useSelectedTab({
      spaceId,
      integrationTabs: INTEGRATION_TABS,
    });

    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner data-test-subj="loadingInstalledIntegrations" />;
    }

    return (
      <OnboardingCardContentPanel>
        <IntegrationContextProvider spaceId={spaceId} trackLinkClick={trackLinkClick}>
          <WithFilteredIntegrations
            renderChildren={IntegrationsCardGridTabs}
            prereleaseIntegrationsEnabled={true}
            checkCompleteMetadata={checkCompleteMetadata}
            selectedTabResult={selectedTabResult}
          />
        </IntegrationContextProvider>
      </OnboardingCardContentPanel>
    );
  }
);
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
