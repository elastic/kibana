/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../app/types';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana } from '../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import type { BriefRange } from '../../../common/entity_analytics/executive_brief/constants';
import { ExecutiveBriefFlyout } from '../components/executive_brief/flyout/executive_brief_flyout';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.settingsMenuItemLabel',
  { defaultMessage: 'Settings' }
);

export const ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeSettingsMenuItem';

export const ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeExecutiveBriefMenuItem';

const EXECUTIVE_BRIEF_LABEL = 'Executive brief';
const DEFAULT_BRIEF_RANGE: BriefRange = '7d';

interface EntityAnalyticsHomeHeaderProps {
  /** Page time range; the executive brief is generated for this window. */
  timeRange?: BriefRange;
}

export const EntityAnalyticsHomeHeader = React.memo<EntityAnalyticsHomeHeaderProps>(
  ({ timeRange = DEFAULT_BRIEF_RANGE }) => {
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const { docLinks } = useKibana().services;
    const isExecutiveBriefEnabled = useIsExperimentalFeatureEnabled(
      'entityAnalyticsExecutiveBriefEnabled'
    );
    const [isBriefOpen, setIsBriefOpen] = useState(false);
    const openBrief = useCallback(() => setIsBriefOpen(true), []);
    const closeBrief = useCallback(() => setIsBriefOpen(false), []);

    const menu = useMemo<AppHeaderMenu>(
      () => ({
        items: [
          ...(isExecutiveBriefEnabled
            ? [
                {
                  id: 'executiveBrief',
                  label: EXECUTIVE_BRIEF_LABEL,
                  iconType: 'productAgent' as const,
                  run: openBrief,
                  testId: ENTITY_ANALYTICS_HOME_EXECUTIVE_BRIEF_MENU_ITEM_TEST_ID,
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
        ],
      }),
      [getSecuritySolutionUrl, isExecutiveBriefEnabled, openBrief]
    );

    return (
      <>
        <SecurityAppHeader
          title={PAGE_TITLE}
          menu={menu}
          spacing="largeBleed"
          docLink={docLinks.links.securitySolution.entityAnalytics.entityRiskScoring}
        />
        {isExecutiveBriefEnabled && isBriefOpen && (
          <ExecutiveBriefFlyout timeRange={timeRange} onClose={closeBrief} />
        )}
      </>
    );
  }
);

EntityAnalyticsHomeHeader.displayName = 'EntityAnalyticsHomeHeader';
