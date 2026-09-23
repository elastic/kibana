/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import { NightshiftAppHeader } from './app/app_header';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';
import { SandboxSecretsFlyout } from './sandbox_secrets/sandbox_secrets_flyout';

export function NightshiftPage(): React.ReactElement | null {
  const {
    application,
    http: { basePath },
    serverless,
    observabilityShared,
    nightshiftInvestigations,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const settingsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/settings',
  });
  const managementHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/streams',
  });
  const navigateToSettings = useCallback(
    () => application.navigateToUrl(settingsHref),
    [application, settingsHref]
  );
  const navigateToManagement = useCallback(
    () => application.navigateToUrl(managementHref),
    [application, managementHref]
  );

  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const canManageSandboxSecrets =
    canManage && nightshiftInvestigations?.investigationsClient != null;
  const [isSandboxSecretsFlyoutOpen, setIsSandboxSecretsFlyoutOpen] = useState(false);
  const openSandboxSecretsFlyout = useCallback(() => setIsSandboxSecretsFlyoutOpen(true), []);
  const closeSandboxSecretsFlyout = useCallback(() => setIsSandboxSecretsFlyoutOpen(false), []);

  const { isAvailable, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if (!isAvailabilityLoading && !isAvailable) {
      application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID);
    }
  }, [application, isAvailable, isAvailabilityLoading]);

  if (!isAvailable) {
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
      <NightshiftAppHeader
        onManagementClick={navigateToManagement}
        managementHref={managementHref}
        onSettingsClick={navigateToSettings}
        settingsHref={settingsHref}
        onSandboxSecretsClick={canManageSandboxSecrets ? openSandboxSecretsFlyout : undefined}
      />
      <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
        <NightshiftApp />
      </EuiPageTemplate.Section>
      {canManageSandboxSecrets && isSandboxSecretsFlyoutOpen && (
        <SandboxSecretsFlyout onClose={closeSandboxSecretsFlyout} />
      )}
    </ObservabilityPageTemplate>
  );
}
