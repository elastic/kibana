/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { getNightshiftCapabilities, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import { NightshiftAppHeader, nightshiftTabs } from './app/app_header';
import { AutomationsPage } from './automations/automations_page';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';
import { SandboxSecretsFlyout } from './sandbox_secrets/sandbox_secrets_flyout';

export function NightshiftPage(): React.ReactElement | null {
  const {
    application,
    featureFlags,
    http: { basePath },
    serverless,
    observabilityShared,
    nightshiftInvestigations,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const { pathname } = useLocation();
  const { canConfigure, canManage } = getNightshiftCapabilities(
    application.capabilities.nightshift
  );
  const settingsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/settings',
  });
  const managementHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/streams',
  });
  const canUseAutomations =
    featureFlags.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false) &&
    nightshiftInvestigations?.investigationsClient != null;
  const investigationsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/investigations',
  });
  const automationsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/automations',
  });
  const navigateToSettings = useCallback(
    () => application.navigateToUrl(settingsHref),
    [application, settingsHref]
  );
  const navigateToManagement = useCallback(
    () => application.navigateToUrl(managementHref),
    [application, managementHref]
  );
  const navigateToInvestigations = useCallback(
    () => application.navigateToUrl(investigationsHref),
    [application, investigationsHref]
  );
  const isInvestigationsPage =
    pathname.startsWith('/investigations') || pathname === '/automations';
  const canUseInvestigationsPage = canUseAutomations && isInvestigationsPage;
  const tabs = canUseAutomations
    ? nightshiftTabs.map((tab) => ({
        ...tab,
        isSelected:
          tab.id === (pathname.endsWith('/automations') ? 'automations' : 'allInvestigations'),
        href: tab.id === 'automations' ? automationsHref : investigationsHref,
      }))
    : undefined;

  // The secrets API is disabled (404) unless the nightshift.enabled flag is on.
  const canManageSandboxSecrets =
    canManage &&
    nightshiftInvestigations?.investigationsClient != null &&
    featureFlags.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false);
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
        // color: 'subdued',
        paddingSize: 'none',
      }}
    >
      <NightshiftAppHeader
        onManagementClick={navigateToManagement}
        managementHref={managementHref}
        onSettingsClick={canConfigure ? navigateToSettings : undefined}
        settingsHref={canConfigure ? settingsHref : undefined}
        onSandboxSecretsClick={canManageSandboxSecrets ? openSandboxSecretsFlyout : undefined}
        onAutomationsClick={canUseAutomations ? navigateToInvestigations : undefined}
        investigationsHref={canUseAutomations ? investigationsHref : undefined}
        tabs={canUseInvestigationsPage ? tabs : undefined}
        back={
          canUseInvestigationsPage
            ? {
                href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' }),
                label: 'Nightshift',
              }
            : undefined
        }
      />
      <EuiPageTemplate.Section
        component="div"
        // color="subdued"
        restrictWidth={pathname.endsWith('/automations') ? false : '900px'}
      >
        {canUseInvestigationsPage ? (
          <Routes>
            <Route path="/automations" component={AutomationsPage} />
            <Route path="/investigations" component={() => <div>WIP</div>} />
          </Routes>
        ) : (
          <NightshiftApp />
        )}
      </EuiPageTemplate.Section>
      {canManageSandboxSecrets && isSandboxSecretsFlyoutOpen && (
        <SandboxSecretsFlyout onClose={closeSandboxSecretsFlyout} />
      )}
    </ObservabilityPageTemplate>
  );
}
