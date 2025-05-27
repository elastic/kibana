/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CenteredLoadingSpinner } from '../../../../../common/components/centered_loading_spinner';
import { useOnboardingContext } from '../../../onboarding_context';
import type { IntegrationCardMetadata } from '../../../../../common/lib/integrations/types';
import { SecurityIntegrations } from '../../../../../common/lib/integrations/components';
import { IntegrationCardTopCallout } from '../common/integrations/callouts/integration_card_top_callout';
import { IntegrationContextProvider } from '../../../../../common/lib/integrations/hooks/integration_context';
import { INTEGRATION_TABS } from '../../../../../common/lib/integrations/configs/integration_tabs_configs';

export const IntegrationsCard: OnboardingCardComponent<IntegrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata }) => {
    const {
      spaceId,
      telemetry: { reportLinkClick },
    } = useOnboardingContext();

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
          <SecurityIntegrations
            checkCompleteMetadata={checkCompleteMetadata}
            topCalloutRenderer={IntegrationCardTopCallout}
          />
        </IntegrationContextProvider>
      </OnboardingCardContentPanel>
    );
  }
);
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
