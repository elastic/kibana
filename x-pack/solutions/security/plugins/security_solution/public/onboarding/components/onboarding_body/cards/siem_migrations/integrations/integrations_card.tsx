/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiBadge, EuiSpacer } from '@elastic/eui';

import type { OnboardingCardComponent } from '../../../../../types';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type { IntegrationCardMetadata } from '../../../../../../common/lib/integrations/types';
import { IntegrationContextProvider } from '../../../../../../common/lib/integrations/hooks/integration_context';
import { INTEGRATION_TABS } from '../../../../../../common/lib/integrations/configs/integration_tabs_configs';
import { SecurityIntegrationsGridTabs } from '../../../../../../common/lib/integrations/components/security_integrations_grid_tabs';
import {
  useIntegrationCardList,
  type GetCardItemExtraProps,
} from '../../../../../../common/lib/integrations/hooks/use_integration_card_list';
import {
  withAvailablePackages,
  type AvailablePackages,
} from '../../../../../../common/lib/integrations/components/with_available_packages';
import { useOnboardingContext } from '../../../../onboarding_context';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { IntegrationCardTopCallout } from '../../common/integrations/callouts/integration_card_top_callout';
import { OnboardingCardId } from '../../../../../constants';
import { MissingMigrationCallout } from './missing_migration_callout';

const getCardItemExtraProps: GetCardItemExtraProps = (card) => ({
  //   extraLabelsBadges: card.categories.map((cat) => <EuiBadge color="hollow">{cat}</EuiBadge>),
  //   showLabels: true,
});

export const DEFAULT_CHECK_COMPLETE_METADATA: IntegrationCardMetadata = {
  activeIntegrations: [],
  isAgentRequired: false,
};

interface SecurityIntegrationsProps {
  availablePackages: AvailablePackages;
  checkCompleteMetadata?: IntegrationCardMetadata;
}

export const SecurityMigrationIntegrations = withAvailablePackages<SecurityIntegrationsProps>(
  ({ availablePackages, checkCompleteMetadata = DEFAULT_CHECK_COMPLETE_METADATA }) => {
    const { isAgentRequired, activeIntegrations } = checkCompleteMetadata;

    const list = useIntegrationCardList({
      integrationsList: availablePackages.filteredCards,
      activeIntegrations,
      getCardItemExtraProps,
    });
    const activeIntegrationsCount = activeIntegrations?.length ?? 0;

    return (
      <SecurityIntegrationsGridTabs
        isAgentRequired={isAgentRequired}
        activeIntegrationsCount={activeIntegrationsCount}
        topCalloutRenderer={IntegrationCardTopCallout}
        integrationList={list}
        availablePackages={availablePackages}
      />
    );
  }
);

export const IntegrationsCard: OnboardingCardComponent<IntegrationCardMetadata> = React.memo(
  ({ checkCompleteMetadata, isCardComplete, setExpandedCardId }) => {
    const { spaceId, telemetry } = useOnboardingContext();

    const isMigrationsCardComplete = isCardComplete(OnboardingCardId.siemMigrationsRules);

    const expandMigrationsCard = useCallback(() => {
      setExpandedCardId(OnboardingCardId.siemMigrationsRules);
    }, [setExpandedCardId]);

    if (!checkCompleteMetadata) {
      return <CenteredLoadingSpinner data-test-subj="loadingInstalledIntegrations" />;
    }

    return (
      <OnboardingCardContentPanel>
        <IntegrationContextProvider
          spaceId={spaceId}
          reportLinkClick={telemetry.reportLinkClick}
          integrationTabs={INTEGRATION_TABS}
        >
          {!isMigrationsCardComplete && (
            <>
              <MissingMigrationCallout onExpandMigrationsCard={expandMigrationsCard} />
              <EuiSpacer size="s" />
            </>
          )}
          <SecurityMigrationIntegrations checkCompleteMetadata={checkCompleteMetadata} />
        </IntegrationContextProvider>
      </OnboardingCardContentPanel>
    );
  }
);
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
