/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import { NightshiftAppHeader } from './app/app_header';
import { useKibana } from './hooks/use_kibana';

export function NightshiftPage(): React.ReactElement | null {
  const {
    application,
    http: { basePath },
    featureFlags,
    serverless,
    observabilityShared,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const settingsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/settings',
  });
  const navigateToSettings = useCallback(
    () => application.navigateToUrl(settingsHref),
    [application, settingsHref]
  );

  // Availability is owned by this flag alone — the /available endpoint is the same
  // gate on the server, so a second client probe would only duplicate it.
  const isEnabled = featureFlags.getBooleanValue(STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG, false);

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.observability.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if (!isEnabled) {
      application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID);
    }
  }, [application, isEnabled]);

  if (!isEnabled) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth={false}
      pageSectionProps={{
        color: 'subdued',
        paddingSize: 'none',
      }}
    >
      <NightshiftAppHeader onSettingsClick={navigateToSettings} settingsHref={settingsHref} />
      <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
        <NightshiftApp />
      </EuiPageTemplate.Section>
    </ObservabilityPageTemplate>
  );
}
