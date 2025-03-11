/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { IntegrationsCardGridTabs } from './integration_card_grid_tabs';
import { CenteredLoadingSpinner } from '../../../../../common/components/centered_loading_spinner';
import type { IntegrationCardMetadata } from './types';

export const IntegrationsCard: OnboardingCardComponent<IntegrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata }) => {
    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner data-test-subj="loadingInstalledIntegrations" />;
    }
    const { installedIntegrationsCount, isAgentRequired } = checkCompleteMetadata;

    return (
      <OnboardingCardContentPanel>
        <IntegrationsCardGridTabs
          isAgentRequired={isAgentRequired}
          installedIntegrationsCount={installedIntegrationsCount}
        />
      </OnboardingCardContentPanel>
    );
  }
);
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
