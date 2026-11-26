/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { APP_UI_ID, USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana } from '../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { ENTITY_ANALYTICS_AI_AGENTS_PATH } from '../components/ai_agents/constants';
import { NAV_LINK_LABEL as AI_AGENTS_LABEL } from '../components/ai_agents/translations';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.settingsMenuItemLabel',
  { defaultMessage: 'Settings' }
);

const PRODUCT_TOUR_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.productTourMenuItemLabel',
  { defaultMessage: 'Product tour' }
);

export const ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeSettingsMenuItem';
export const ENTITY_ANALYTICS_HOME_PRODUCT_TOUR_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeProductTourMenuItem';
export const ENTITY_ANALYTICS_HOME_AI_AGENTS_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeAiAgentsMenuItem';

export interface EntityAnalyticsHomeHeaderProps {
  /** Adds a Product tour menu item that starts the page tour. */
  onStartTour?: () => void;
}

export const EntityAnalyticsHomeHeader = React.memo(
  ({ onStartTour }: EntityAnalyticsHomeHeaderProps) => {
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const { application, docLinks, featureFlags } = useKibana().services;
    // The new page's route drops the template padding that `largeBleed` reaches out of.
    const isNewHomePageEnabled = featureFlags.useBooleanValue(
      USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG,
      true
    );
    const isAiAgentsPocEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsAiAgentsPoc');

    const menu = useMemo<AppHeaderMenu>(
      () => ({
        items: [
          ...(isAiAgentsPocEnabled
            ? [
                {
                  id: 'entityAnalyticsAiAgents',
                  label: AI_AGENTS_LABEL,
                  iconType: 'sparkles' as const,
                  href: application.getUrlForApp(APP_UI_ID, {
                    path: ENTITY_ANALYTICS_AI_AGENTS_PATH,
                  }),
                  order: 0,
                  testId: ENTITY_ANALYTICS_HOME_AI_AGENTS_MENU_ITEM_TEST_ID,
                },
              ]
            : []),
          {
            id: 'entityAnalyticsSettings',
            label: SETTINGS_LABEL,
            iconType: 'gear' as const,
            href: getSecuritySolutionUrl({
              deepLinkId: SecurityPageName.entityAnalyticsManagement,
            }),
            overflow: true,
            order: 1,
            testId: ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID,
          },
          ...(onStartTour
            ? [
                {
                  id: 'entityAnalyticsProductTour',
                  label: PRODUCT_TOUR_LABEL,
                  iconType: 'bulb' as const,
                  run: onStartTour,
                  overflow: true,
                  order: 2,
                  testId: ENTITY_ANALYTICS_HOME_PRODUCT_TOUR_MENU_ITEM_TEST_ID,
                },
              ]
            : []),
        ],
      }),
      [getSecuritySolutionUrl, onStartTour, isAiAgentsPocEnabled, application]
    );

    return (
      <SecurityAppHeader
        title={PAGE_TITLE}
        menu={menu}
        spacing={isNewHomePageEnabled ? 'standard' : 'largeBleed'}
        docLink={docLinks.links.securitySolution.entityAnalytics.entityRiskScoring}
      />
    );
  }
);

EntityAnalyticsHomeHeader.displayName = 'EntityAnalyticsHomeHeader';
