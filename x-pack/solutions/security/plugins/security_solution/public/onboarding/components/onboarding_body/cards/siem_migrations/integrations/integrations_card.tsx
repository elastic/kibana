/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiBadge, EuiSpacer } from '@elastic/eui';

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { OnboardingCardComponent } from '../../../../../types';
import type { RuleMigrationAllIntegrationsStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { CenteredLoadingSpinner } from '../../../../../../common/components/centered_loading_spinner';
import type {
  IntegrationCardMetadata,
  TopCalloutRenderer,
} from '../../../../../../common/lib/integrations/types';
import { IntegrationContextProvider } from '../../../../../../common/lib/integrations/hooks/integration_context';
import { INTEGRATION_TABS } from '../../../../../../common/lib/integrations/configs/integration_tabs_configs';
import { SecurityIntegrationsGridTabs } from '../../../../../../common/lib/integrations/components/security_integrations_grid_tabs';
import { useIntegrationCardList } from '../../../../../../common/lib/integrations/hooks/use_integration_card_list';
import {
  withAvailablePackages,
  type AvailablePackages,
} from '../../../../../../common/lib/integrations/components/with_available_packages';
import { useOnboardingContext } from '../../../../onboarding_context';
import { OnboardingCardContentPanel } from '../../common/card_content_panel';
import { IntegrationCardTopCallout } from '../../common/integrations/callouts/integration_card_top_callout';
import { useGetIntegrationsStats } from '../../../../../../siem_migrations/rules/service/hooks/use_get_integrations_stats';
import { OnboardingCardId } from '../../../../../constants';
import { MissingMigrationCallout } from './missing_migration_callout';
import * as i18n from './translations';

export const DEFAULT_CHECK_COMPLETE_METADATA: IntegrationCardMetadata = {
  activeIntegrations: [],
  isAgentRequired: false,
};

interface SecurityIntegrationsProps {
  availablePackages: AvailablePackages;
  integrationsStats: RuleMigrationAllIntegrationsStats;
  checkCompleteMetadata?: IntegrationCardMetadata;
  topCalloutRenderer?: TopCalloutRenderer;
}

export const SecurityMigrationIntegrations = withAvailablePackages<SecurityIntegrationsProps>(
  ({
    availablePackages,
    checkCompleteMetadata = DEFAULT_CHECK_COMPLETE_METADATA,
    integrationsStats,
    topCalloutRenderer,
  }) => {
    const { isAgentRequired, activeIntegrations } = checkCompleteMetadata;
    const activeIntegrationsCount = activeIntegrations?.length ?? 0;

    const list = useIntegrationCardList({
      integrationsList: availablePackages.filteredCards,
      activeIntegrations,
    });

    // Create the integrations list using integrationStats which is already sorted by total rules
    const integrationList = useMemo(() => {
      if (!integrationsStats?.length) {
        return list;
      }
      return integrationsStats.reduce<IntegrationCardItem[]>((acc, { id, total_rules: total }) => {
        const card = list.find((cardItem) => cardItem.id === `epr:${id}`);
        if (!card) {
          // should never happen, but just in case
          return acc;
        }
        acc.push({
          ...card,
          titleBadge: <EuiBadge color="hollow">{i18n.TOTAL_RULES(total)}</EuiBadge>,
        });
        return acc;
      }, []);
    }, [list, integrationsStats]);

    return (
      <SecurityIntegrationsGridTabs
        isAgentRequired={isAgentRequired}
        activeIntegrationsCount={activeIntegrationsCount}
        topCalloutRenderer={topCalloutRenderer}
        integrationList={integrationList}
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

    const [integrationsStats, setIntegrationsStats] = useState<
      RuleMigrationAllIntegrationsStats | undefined
    >();
    const { getIntegrationsStats, isLoading } = useGetIntegrationsStats(setIntegrationsStats);

    useEffect(() => {
      if (isMigrationsCardComplete) {
        getIntegrationsStats();
      } else {
        setIntegrationsStats([]);
      }
    }, [getIntegrationsStats, isMigrationsCardComplete]);

    const integrationTabs = useMemo(() => {
      if (!integrationsStats?.length) {
        return INTEGRATION_TABS;
      }
      const featuredCardIds = integrationsStats.map((integration) => `epr:${integration.id}`);
      const [recommendedTab, ...rest] = INTEGRATION_TABS;
      return [
        {
          ...recommendedTab,
          label: i18n.DETECTED_TAB_LABEL,
          featuredCardIds,
          overflow: 'scroll' as const,
        },
        ...rest,
      ];
    }, [integrationsStats]);

    const topCalloutRenderer = useCallback<TopCalloutRenderer>(
      ({ activeIntegrationsCount, isAgentRequired, selectedTabId }) => {
        return (
          <>
            {!isMigrationsCardComplete && (
              <>
                <MissingMigrationCallout onExpandMigrationsCard={expandMigrationsCard} />
                <EuiSpacer size="s" />
              </>
            )}
            <IntegrationCardTopCallout
              activeIntegrationsCount={activeIntegrationsCount}
              isAgentRequired={isAgentRequired}
              selectedTabId={selectedTabId}
            />
          </>
        );
      },
      [isMigrationsCardComplete, expandMigrationsCard]
    );
    if (!checkCompleteMetadata || isLoading || !integrationsStats) {
      return <CenteredLoadingSpinner data-test-subj="loadingInstalledIntegrations" />;
    }

    return (
      <OnboardingCardContentPanel>
        <IntegrationContextProvider
          spaceId={spaceId}
          reportLinkClick={telemetry.reportLinkClick}
          integrationTabs={integrationTabs}
        >
          <SecurityMigrationIntegrations
            prereleaseIntegrationsEnabled={true} // Rule migrations uses prerelease integrations
            integrationsStats={integrationsStats}
            checkCompleteMetadata={checkCompleteMetadata}
            topCalloutRenderer={topCalloutRenderer}
          />
        </IntegrationContextProvider>
      </OnboardingCardContentPanel>
    );
  }
);
IntegrationsCard.displayName = 'IntegrationsCard';

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
