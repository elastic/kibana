/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import React, { useCallback } from 'react';
import { NightshiftAppHeader } from '../components/app_header';
import { getWorkflowFailureMessage } from '../common/errors';
import { SignificantEventsPageProvider } from '../data/discovery/significant_events_page_context';
import { useBlocksNewActivity } from '../data/maintenance/use_significant_events_maintenance';
import { useKibana } from '../hooks/use_kibana';
import { KiGenerationProvider } from './onboarding/ki_generation_context';
import { PausedActivityCallout } from './paused_activity_callout';
import { SourcesView } from './sources_view';
import { ONBOARDING_FAILURE_TITLE } from './translations';

export type SourcesPageHeaderProps = Record<string, never>;

export function SourcesPage({
  headerProps,
}: {
  headerProps: SourcesPageHeaderProps;
}): React.ReactElement {
  const {
    application,
    notifications: { toasts },
  } = useKibana().services;
  const { canManageAndConfigure } = getNightshiftCapabilities(application.capabilities.nightshift);
  const {
    isBlocked,
    isLoading: isMaintenanceStatusLoading,
    isError: isMaintenanceStatusError,
    status: maintenanceStatus,
  } = useBlocksNewActivity();
  const settingsHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/settings/detections',
  });
  const onOnboardingFailed = useCallback(
    (error: string) => {
      toasts.addError(new Error(getWorkflowFailureMessage(error)), {
        title: ONBOARDING_FAILURE_TITLE,
      });
    },
    [toasts]
  );

  return (
    <>
      <NightshiftAppHeader
        {...headerProps}
        page="sources"
        back={{
          href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/detections/events' }),
          label: i18n.translate('xpack.nightshift.sourcesPage.backToDetectionsLabel', {
            defaultMessage: 'Detections',
          }),
        }}
      />
      <EuiPageTemplate.Section component="div" restrictWidth={false}>
        {isMaintenanceStatusLoading && (
          <>
            <KbnInfoCallout
              announceOnMount
              size="s"
              data-test-subj="significantEventsStatusLoadingBanner"
              title={i18n.translate('xpack.nightshift.statusLoadingBannerTitle', {
                defaultMessage: 'Checking significant events activity status',
              })}
              text={i18n.translate('xpack.nightshift.statusLoadingBannerBody', {
                defaultMessage: 'Manual triggers stay disabled until activity status is known.',
              })}
            />
            <EuiSpacer />
          </>
        )}
        {isMaintenanceStatusError && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              data-test-subj="significantEventsStatusErrorBanner"
              title={i18n.translate('xpack.nightshift.statusErrorBannerTitle', {
                defaultMessage: 'Could not load significant events activity status',
              })}
              text={i18n.translate('xpack.nightshift.statusErrorBannerBody', {
                defaultMessage:
                  'Manual triggers stay disabled until status can be loaded. Open settings to retry, or refresh the page.',
              })}
              actionProps={
                canManageAndConfigure
                  ? {
                      primary: {
                        children: i18n.translate(
                          'xpack.nightshift.statusErrorBannerSettingsButton',
                          {
                            defaultMessage: 'Open settings',
                          }
                        ),
                        href: settingsHref,
                        'data-test-subj': 'significantEventsStatusErrorBannerSettingsLink',
                      },
                    }
                  : undefined
              }
            />
            <EuiSpacer />
          </>
        )}
        {isBlocked && maintenanceStatus && (
          <>
            <PausedActivityCallout
              status={maintenanceStatus}
              canManageAndConfigure={canManageAndConfigure}
              settingsHref={settingsHref}
            />
            <EuiSpacer />
          </>
        )}
        <SignificantEventsPageProvider>
          <KiGenerationProvider onFailed={onOnboardingFailed}>
            <SourcesView />
          </KiGenerationProvider>
        </SignificantEventsPageProvider>
      </EuiPageTemplate.Section>
    </>
  );
}
