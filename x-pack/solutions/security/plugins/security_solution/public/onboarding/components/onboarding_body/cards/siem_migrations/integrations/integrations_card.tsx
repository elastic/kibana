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
  Tab,
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
import { useSelectedTab } from '../../../../../../common/lib/integrations/hooks/use_selected_tab';

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
    const { selectedTab, setSelectedTabId } = useSelectedTab();
    const list = useIntegrationCardList({
      integrationsList: availablePackages.filteredCards,
      activeIntegrations,
      selectedTab,
    });

    // Create the integrations list using integrationStats which is already sorted by total rules
    const integrationList = useMemo(() => {
      if (!integrationsStats?.length) {
        return list;
      }
      const indexedStats = Object.fromEntries(
        integrationsStats.map((stats) => [stats.id, stats.total_rules])
      );
      // Process the list to include only the cards that have integrations stats and set the title badge
      // Use indexedStats to keep O(n) complexity
      const indexedCards = list.reduce<Record<string, IntegrationCardItem>>((acc, card) => {
        const totalRules = indexedStats[card.id];
        if (!totalRules) {
          return acc;
        }
        const titleBadge = <EuiBadge color="hollow">{i18n.TOTAL_RULES(totalRules)}</EuiBadge>;
        acc[card.id] = { ...card, titleBadge };
        return acc;
      }, {});

      // Use the same order as the integrationsStats (descending by total rules from API)
      return integrationsStats.reduce<IntegrationCardItem[]>((acc, { id }) => {
        const card = indexedCards[id];
        if (card) {
          acc.push(card);
        }
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
        selectedTab={selectedTab}
        setSelectedTabId={setSelectedTabId}
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

    const [integrationsStats, setIntegrationsStats] = useState<RuleMigrationAllIntegrationsStats>(
      []
    );
    const processIntegrationsStats = useCallback((stats: RuleMigrationAllIntegrationsStats) => {
      // Prefix IDs with 'epr:' to match the integration card IDs
      setIntegrationsStats(stats.map((stat) => ({ ...stat, id: `epr:${stat.id}` })));
    }, []);

    const { getIntegrationsStats, isLoading } = useGetIntegrationsStats(processIntegrationsStats);

    useEffect(() => {
      // fetch integrations stats only if the migrations card is complete (al least one migration is complete),
      if (isMigrationsCardComplete) {
        getIntegrationsStats();
      }
    }, [getIntegrationsStats, isMigrationsCardComplete]);

    // Replace the static "recommended" tab by the dynamic "detected" tab, based on the migrations integrations stats
    const integrationTabs = useMemo((): Tab[] => {
      const [recommendedTab, ...rest] = INTEGRATION_TABS;
      if (!integrationsStats?.length) {
        return [
          { ...recommendedTab, appendAutoImportCard: true, overflow: 'scroll' as const },
          ...rest,
        ];
      }
      const featuredCardIds = integrationsStats.map(({ id }) => id);
      return [
        {
          ...recommendedTab,
          label: i18n.DETECTED_TAB_LABEL,
          featuredCardIds,
          appendAutoImportCard: true,
          overflow: 'scroll' as const,
        },
        ...rest,
      ];
    }, [integrationsStats]);

    // Wrap the top callout renderer to include the missing migration callout
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

    if (!checkCompleteMetadata || isLoading) {
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
