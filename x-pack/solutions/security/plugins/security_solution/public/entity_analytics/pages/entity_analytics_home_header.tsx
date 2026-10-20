/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../app/types';
import { SecurityAppHeader } from '../../common/components/app_header';
import { useKibana } from '../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.homePage.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const SETTINGS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.settingsMenuItemLabel',
  { defaultMessage: 'Settings' }
);

export const ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID =
  'entityAnalyticsHomeSettingsMenuItem';

export const EntityAnalyticsHomeHeader = React.memo(() => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { docLinks } = useKibana().services;

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'entityAnalyticsSettings',
          label: SETTINGS_LABEL,
          iconType: 'gear' as const,
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalyticsManagement }),
          overflow: true,
          order: 1,
          testId: ENTITY_ANALYTICS_HOME_MANAGEMENT_MENU_ITEM_TEST_ID,
        },
      ],
    }),
    [getSecuritySolutionUrl]
  );

  return (
    <SecurityAppHeader
      title={PAGE_TITLE}
      menu={menu}
      spacing="largeBleed"
      docLink={docLinks.links.securitySolution.entityAnalytics.entityRiskScoring}
    />
  );
});

EntityAnalyticsHomeHeader.displayName = 'EntityAnalyticsHomeHeader';
