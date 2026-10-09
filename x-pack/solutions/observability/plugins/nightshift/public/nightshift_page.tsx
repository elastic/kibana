/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useHistory, useLocation } from 'react-router-dom';
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
import { NightshiftAppHeader, SETTINGS_PAGE_TITLE } from './app/app_header';
import { AutomationsPage } from './automations/automations_page';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';
import { SandboxSecretsFlyout } from './sandbox_secrets/sandbox_secrets_flyout';
import { CustomContextFlyout } from './custom_context/custom_context_flyout';
import { NightshiftOnboarding } from './onboarding/onboarding';
import { useOnboardingVisibility } from './onboarding/use_onboarding_visibility';
import { SettingsPage } from './settings/page';

/** Onboarding has a second column for the "Get started" card. */
const ONBOARDING_MAX_WIDTH = '1040px';

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
  const { pathname, search } = useLocation();
  const history = useHistory();
  const { canShow, canManage, canManageAndConfigure } = getNightshiftCapabilities(
    application.capabilities.nightshift
  );
  const settingsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/settings',
  });
  const managementHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/streams',
  });
  const nightshiftEnabled = featureFlags.useBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false);
  const canUseAutomations =
    nightshiftEnabled && nightshiftInvestigations?.investigationsClient != null;
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
  const navigateToAutomations = useCallback(
    () => application.navigateToUrl(automationsHref),
    [application, automationsHref]
  );
  const isSettingsPage = pathname === '/settings' || pathname.startsWith('/settings/');
  const canUseAutomationsPage = canUseAutomations && pathname.startsWith('/automations');
  const isAutomationDetailRoute = pathname.startsWith('/automations/');

  // The secrets API is disabled (404) unless the nightshift.enabled flag is on.
  const canManageSandboxSecrets =
    canManage && nightshiftInvestigations?.investigationsClient != null && nightshiftEnabled;
  const [isSandboxSecretsFlyoutOpen, setIsSandboxSecretsFlyoutOpen] = useState(false);
  const openSandboxSecretsFlyout = useCallback(() => setIsSandboxSecretsFlyoutOpen(true), []);
  const closeSandboxSecretsFlyout = useCallback(() => setIsSandboxSecretsFlyoutOpen(false), []);

  // Like the secrets API, the custom context API is disabled (404) unless the flag is on.
  const canViewCustomContext =
    canShow && nightshiftInvestigations?.investigationsClient != null && nightshiftEnabled;
  const [isCustomContextFlyoutOpen, setIsCustomContextFlyoutOpen] = useState(false);
  const openCustomContextFlyout = useCallback(() => setIsCustomContextFlyoutOpen(true), []);
  const closeCustomContextFlyout = useCallback(() => setIsCustomContextFlyoutOpen(false), []);

  const { isAvailable, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();

  const onboarding = useOnboardingVisibility({
    isEnabled: canManage && nightshiftInvestigations?.investigationsClient != null,
    canUseAutomations,
    forceOnboarding: new URLSearchParams(search).get('onboarding') === '1',
  });
  const { dismiss: dismissOnboarding } = onboarding;
  const finishOnboarding = useCallback(() => {
    const params = new URLSearchParams(history.location.search);
    params.delete('onboarding');
    history.replace({ search: params.toString() });
    dismissOnboarding();
  }, [dismissOnboarding, history]);
  const isOnboarding = !canUseAutomationsPage && onboarding.showOnboarding;
  // Before the first investigation the page is only about onboarding, as in the design.
  const hidesHeaderActions = isOnboarding && !onboarding.latestInvestigation;

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
      ...(pathname.startsWith('/automations')
        ? [
            {
              ...(isAutomationDetailRoute && { href: automationsHref }),
              text: i18n.translate('xpack.nightshift.automations.breadcrumb', {
                defaultMessage: 'Automations',
              }),
            },
            ...(isAutomationDetailRoute && !pathname.includes('/runs') && !pathname.endsWith('/new')
              ? [
                  {
                    text: i18n.translate('xpack.nightshift.automations.detail.breadcrumb', {
                      defaultMessage: 'Automation details',
                    }),
                  },
                ]
              : []),
          ]
        : []),
      ...(isSettingsPage ? [{ text: SETTINGS_PAGE_TITLE }] : []),
    ],
    { serverless }
  );

  useEffect(() => {
    if (!isAvailabilityLoading && !isAvailable) {
      application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID);
    }
  }, [application, isAvailable, isAvailabilityLoading]);

  useEffect(() => {
    if (isSettingsPage && !canManageAndConfigure) {
      application.navigateToApp(NIGHTSHIFT_APP_ID);
    }
  }, [application, canManageAndConfigure, isSettingsPage]);

  if (!isAvailable) {
    return null;
  }

  if (isSettingsPage && !canManageAndConfigure) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth={false}
      pageSectionProps={{
        paddingSize: 'none',
      }}
    >
      {isSettingsPage ? (
        <Routes>
          <Route path="/settings/:tab?">
            <SettingsPage
              headerProps={{
                onManagementClick: navigateToManagement,
                managementHref,
                onSandboxSecretsClick: canManageSandboxSecrets
                  ? openSandboxSecretsFlyout
                  : undefined,
                onCustomContextClick: canViewCustomContext ? openCustomContextFlyout : undefined,
                onAutomationsClick: canUseAutomations ? navigateToAutomations : undefined,
                automationsHref: canUseAutomations ? automationsHref : undefined,
              }}
            />
          </Route>
        </Routes>
      ) : (
        <>
          <NightshiftAppHeader
            page={canUseAutomationsPage ? 'automations' : 'landing'}
            onManagementClick={navigateToManagement}
            managementHref={managementHref}
            onSettingsClick={canManageAndConfigure ? navigateToSettings : undefined}
            settingsHref={canManageAndConfigure ? settingsHref : undefined}
            onSandboxSecretsClick={canManageSandboxSecrets ? openSandboxSecretsFlyout : undefined}
            onCustomContextClick={canViewCustomContext ? openCustomContextFlyout : undefined}
            onAutomationsClick={
              canUseAutomations && !hidesHeaderActions ? navigateToAutomations : undefined
            }
            automationsHref={canUseAutomations && !hidesHeaderActions ? automationsHref : undefined}
            back={
              canUseAutomationsPage
                ? {
                    href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' }),
                    label: 'Nightshift',
                  }
                : undefined
            }
          />
          <EuiPageTemplate.Section
            component="div"
            restrictWidth={
              canUseAutomationsPage
                ? false
                : isOnboarding || onboarding.isLoading
                ? ONBOARDING_MAX_WIDTH
                : '900px'
            }
          >
            {canUseAutomationsPage ? (
              <Routes>
                <Route path="/automations/:id/runs" component={AutomationsPage} />
                <Route path="/automations/:id" component={AutomationsPage} />
                <Route path="/automations" component={AutomationsPage} />
              </Routes>
            ) : isOnboarding ? (
              <NightshiftOnboarding
                latestInvestigation={onboarding.latestInvestigation}
                automationsHref={canUseAutomations ? automationsHref : undefined}
                onFinish={finishOnboarding}
              />
            ) : onboarding.isLoading ? (
              <EuiFlexGroup justifyContent="center" data-test-subj="nightshiftOnboardingLoading">
                <EuiLoadingSpinner size="xl" />
              </EuiFlexGroup>
            ) : (
              <NightshiftApp />
            )}
          </EuiPageTemplate.Section>
        </>
      )}
      {canManageSandboxSecrets && isSandboxSecretsFlyoutOpen && (
        <SandboxSecretsFlyout onClose={closeSandboxSecretsFlyout} />
      )}
      {canViewCustomContext && isCustomContextFlyoutOpen && (
        <CustomContextFlyout canEdit={canManage} onClose={closeCustomContextFlyout} />
      )}
    </ObservabilityPageTemplate>
  );
}
