/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner, EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import { Route, Routes } from '@kbn/shared-ux-router';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { NIGHTSHIFT_APP_ID, OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import {
  getNightshiftCapabilities,
  NIGHTSHIFT_ENABLED_FLAG,
  SETTINGS_TAB_IDS,
} from '@kbn/nightshift-shared';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import {
  DETECTION_PAGE_TITLE,
  KNOWLEDGE_PAGE_TITLE,
  NightshiftAppHeader,
  SETTINGS_PAGE_TITLE,
  SOURCES_PAGE_TITLE,
} from './components/app_header';
import { AutomationsPage } from './automations/automations_page';
import { useKibana } from './hooks/use_kibana';
import { useDeveloperMode } from './hooks/use_developer_mode';
import { useSignificantEventsAvailability } from './data/availability/use_significant_events_availability';
import { CustomContextFlyout } from './custom_context/custom_context_flyout';
import { StartInvestigationPanel } from './components/start_investigation_panel';
import { NightshiftOnboarding } from './onboarding/onboarding';
import { useOnboardingVisibility } from './onboarding/use_onboarding_visibility';
import { SettingsPage } from './settings/page';
import {
  isNightshiftSetUp,
  useInvestigatorServiceAccount,
} from './service_account/use_investigator_service_account';
import { DETECTION_TAB_IDS, isDetectionTabId } from './pages/detection/detection_tabs';
import { KNOWLEDGE_TAB_IDS } from './knowledge/knowledge_tabs';

/** Onboarding has a second column for the "Get started" card. */
const ONBOARDING_MAX_WIDTH = '1040px';

/** Fixed page names, so ids and query strings never reach execution context. */
const getExecutionContextPage = (pathname: string, canUseAutomationsPage: boolean): string => {
  const [, section, tab] = pathname.split('/');
  const withTab = (tabs: readonly string[]) =>
    tab && tabs.includes(tab) ? `${section}/${tab}` : section;

  switch (section) {
    case 'detections':
      return withTab(DETECTION_TAB_IDS);
    case 'knowledge':
      return withTab(KNOWLEDGE_TAB_IDS);
    case 'settings':
      return withTab(SETTINGS_TAB_IDS);
    case 'sources':
      return 'sources';
    case 'automations':
      return canUseAutomationsPage ? 'automations' : 'landing';
    default:
      return 'landing';
  }
};

const KnowledgePage = React.lazy(() =>
  import('./knowledge/page').then(({ KnowledgePage: Page }) => ({ default: Page }))
);

const SourcesPage = React.lazy(() =>
  import('./sources/page').then(({ SourcesPage: Page }) => ({ default: Page }))
);

const DetectionPage = React.lazy(() =>
  import('./pages/detection/page').then(({ DetectionPage: Page }) => ({ default: Page }))
);

export const DetectionRoute = ({
  headerProps,
}: {
  headerProps: React.ComponentProps<typeof DetectionPage>['headerProps'];
}) => {
  const { tab } = useParams<{ tab?: string }>();
  const { search } = useLocation();
  const { isDeveloperMode } = useDeveloperMode();

  if (!tab || !isDetectionTabId(tab) || (tab === 'signals' && !isDeveloperMode)) {
    return <Redirect to={{ pathname: '/detections/events', search }} />;
  }

  return <DetectionPage headerProps={headerProps} tab={tab} />;
};

export function NightshiftPage(): React.ReactElement | null {
  const { euiTheme } = useEuiTheme();
  const {
    application,
    executionContext,
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
  const detectionSettingsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/settings/detections?origin=detections',
  });
  const knowledgeHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/knowledge',
  });
  const sourcesHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/sources',
  });
  const nightshiftEnabled = featureFlags.useBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false);
  const canUseAutomations =
    nightshiftEnabled && nightshiftInvestigations?.investigationsClient != null;
  const automationsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/automations',
  });
  const detectionsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/detections/events',
  });
  const navigateToDetections = useCallback(
    () => application.navigateToUrl(detectionsHref),
    [application, detectionsHref]
  );
  const navigateToSettings = useCallback(
    () => application.navigateToUrl(settingsHref),
    [application, settingsHref]
  );
  const navigateToDetectionSettings = useCallback(
    () => application.navigateToUrl(detectionSettingsHref),
    [application, detectionSettingsHref]
  );
  const navigateToKnowledge = useCallback(
    () => application.navigateToUrl(knowledgeHref),
    [application, knowledgeHref]
  );
  const navigateToSources = useCallback(
    () => application.navigateToUrl(sourcesHref),
    [application, sourcesHref]
  );
  const navigateToAutomations = useCallback(
    () => application.navigateToUrl(automationsHref),
    [application, automationsHref]
  );
  const isKnowledgePage = pathname === '/knowledge' || pathname.startsWith('/knowledge/');
  const isSourcesPage = pathname === '/sources' || pathname.startsWith('/sources/');
  const isDetectionPage = pathname === '/detections' || pathname.startsWith('/detections/');
  const isSettingsPage = pathname === '/settings' || pathname.startsWith('/settings/');
  const canUseAutomationsPage = canUseAutomations && pathname.startsWith('/automations');
  const isAutomationDetailRoute = pathname.startsWith('/automations/');

  // The custom context API is disabled (404) unless the nightshift.enabled flag is on.
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

  // The landing page owns the start investigation modal so the header's primary action can toggle it.
  const [isStartInvestigationOpen, setIsStartInvestigationOpen] = useState(false);
  const toggleStartInvestigation = useCallback(
    () => setIsStartInvestigationOpen((isOpen) => !isOpen),
    []
  );
  const closeStartInvestigation = useCallback(() => setIsStartInvestigationOpen(false), []);
  useEffect(() => {
    setIsStartInvestigationOpen(false);
  }, [pathname]);
  const isLandingContent = !canUseAutomationsPage && !isOnboarding && !onboarding.isLoading;
  // Starting an investigation only needs the investigations client, so the action and its modal
  // don't depend on what the landing list renders.
  const canStartInvestigation =
    canManage && isLandingContent && nightshiftInvestigations?.investigationsClient != null;

  // Nightshift only works as its service account, so a space that is not set up shows the setup
  // step instead of the app. A failed status read (e.g. missing privileges) does not block it.
  const requiresSetup = nightshiftEnabled && nightshiftInvestigations?.investigationsClient != null;
  const serviceAccount = useInvestigatorServiceAccount();
  const isSetupPending = requiresSetup && serviceAccount.isLoading;
  const needsSetup =
    requiresSetup && serviceAccount.isSuccess && !isNightshiftSetUp(serviceAccount.data);
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
      ...(isKnowledgePage ? [{ text: KNOWLEDGE_PAGE_TITLE }] : []),
      ...(isSourcesPage ? [{ text: SOURCES_PAGE_TITLE }] : []),
      ...(isDetectionPage ? [{ text: DETECTION_PAGE_TITLE }] : []),
    ],
    { serverless }
  );

  useExecutionContext(executionContext, {
    type: 'application',
    name: NIGHTSHIFT_APP_ID,
    page: getExecutionContextPage(pathname, canUseAutomationsPage),
  });

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

  // Until the space is set up, every page shows the regular onboarding, which starts at its
  // "Enable Elastic Nightshift" step, for everyone: only admins can complete it.
  if (isSetupPending || needsSetup) {
    return (
      <ObservabilityPageTemplate
        data-test-subj="nightshiftPage"
        restrictWidth={false}
        pageSectionProps={{ paddingSize: 'none' }}
      >
        {/* Nothing behind the header actions works before setup, so the header carries none. */}
        <NightshiftAppHeader page="landing" />
        <EuiPageTemplate.Section component="div" restrictWidth={ONBOARDING_MAX_WIDTH}>
          {isSetupPending ? (
            <EuiFlexGroup justifyContent="center" data-test-subj="nightshiftSetupLoading">
              <EuiLoadingSpinner size="xl" />
            </EuiFlexGroup>
          ) : (
            <NightshiftOnboarding onFinish={finishOnboarding} />
          )}
        </EuiPageTemplate.Section>
      </ObservabilityPageTemplate>
    );
  }

  const isHomePage =
    !isSettingsPage &&
    !isKnowledgePage &&
    !isSourcesPage &&
    !isDetectionPage &&
    !canUseAutomationsPage &&
    !isOnboarding &&
    !onboarding.isLoading;

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth={false}
      css={
        isDetectionPage
          ? css`
              height: 100%;
              min-height: 0;
              overflow: hidden;
            `
          : undefined
      }
      pageSectionProps={{
        paddingSize: 'none',
        ...(isDetectionPage
          ? {
              css: css`
                min-height: 0;
                overflow: hidden;
              `,
              contentProps: {
                css: css`
                  display: flex;
                  flex: 1 1 auto;
                  flex-direction: column;
                  min-height: 0;
                  height: 100%;
                `,
              },
            }
          : {}),
        ...(isHomePage
          ? {
              css: css`
                background: linear-gradient(
                  ${euiTheme.colors.backgroundBasePlain},
                  ${euiTheme.colors.backgroundBaseSubdued},
                  ${euiTheme.colors.backgroundBasePlain}
                );
              `,
            }
          : {}),
      }}
    >
      {isSettingsPage ? (
        <Routes>
          <Route path="/settings/:tab?">
            <SettingsPage
              headerProps={{
                onCustomContextClick: canViewCustomContext ? openCustomContextFlyout : undefined,
              }}
            />
          </Route>
        </Routes>
      ) : isDetectionPage ? (
        <React.Suspense
          fallback={
            <EuiPageTemplate.Section component="div" restrictWidth={false}>
              <EuiLoadingSpinner size="xl" data-test-subj="nightshiftDetectionPageLazyLoading" />
            </EuiPageTemplate.Section>
          }
        >
          <Routes>
            <Route path="/detections/:tab?">
              <DetectionRoute
                headerProps={{
                  onSourcesClick: navigateToSources,
                  sourcesHref,
                  onKnowledgeClick: navigateToKnowledge,
                  knowledgeHref,
                  onSettingsClick: canManageAndConfigure ? navigateToDetectionSettings : undefined,
                  settingsHref: canManageAndConfigure ? detectionSettingsHref : undefined,
                }}
              />
            </Route>
          </Routes>
        </React.Suspense>
      ) : isSourcesPage ? (
        <React.Suspense
          fallback={
            <EuiPageTemplate.Section component="div" restrictWidth={false}>
              <EuiLoadingSpinner size="xl" data-test-subj="nightshiftSourcesPageLazyLoading" />
            </EuiPageTemplate.Section>
          }
        >
          <Routes>
            <Route path="/sources/:sourceId?">
              <SourcesPage headerProps={{}} />
            </Route>
          </Routes>
        </React.Suspense>
      ) : isKnowledgePage ? (
        <React.Suspense
          fallback={
            <EuiPageTemplate.Section component="div" restrictWidth={false}>
              <EuiLoadingSpinner size="xl" data-test-subj="nightshiftKnowledgePageLazyLoading" />
            </EuiPageTemplate.Section>
          }
        >
          <Routes>
            <Route path="/knowledge/:tab?">
              <KnowledgePage headerProps={{}} />
            </Route>
          </Routes>
        </React.Suspense>
      ) : (
        <>
          <NightshiftAppHeader
            page={canUseAutomationsPage ? 'automations' : 'landing'}
            onKnowledgeClick={navigateToKnowledge}
            knowledgeHref={knowledgeHref}
            onSettingsClick={canManageAndConfigure ? navigateToSettings : undefined}
            settingsHref={canManageAndConfigure ? settingsHref : undefined}
            onAutomationsClick={
              canUseAutomations && !hidesHeaderActions ? navigateToAutomations : undefined
            }
            automationsHref={canUseAutomations && !hidesHeaderActions ? automationsHref : undefined}
            onDetectionsClick={!hidesHeaderActions ? navigateToDetections : undefined}
            detectionsHref={!hidesHeaderActions ? detectionsHref : undefined}
            onStartInvestigationClick={canStartInvestigation ? toggleStartInvestigation : undefined}
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
            color={isHomePage ? 'transparent' : undefined}
            restrictWidth={
              canUseAutomationsPage
                ? false
                : isOnboarding || onboarding.isLoading
                ? ONBOARDING_MAX_WIDTH
                : '1000px'
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
      {canStartInvestigation && isStartInvestigationOpen && (
        <StartInvestigationPanel onClose={closeStartInvestigation} />
      )}
      {canViewCustomContext && isCustomContextFlyoutOpen && (
        <CustomContextFlyout canEdit={canManage} onClose={closeCustomContextFlyout} />
      )}
    </ObservabilityPageTemplate>
  );
}
