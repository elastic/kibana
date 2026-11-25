/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useState } from 'react';
import { EuiEmptyPrompt, EuiLoadingChart, EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import { getDateISORange } from '@kbn/timerange';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type { ApplicationSource } from '../../../common/types/applications';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { ApplicationTabToolbar } from '../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { FRUSTRATION_EBT_ELEMENTS } from '../../ebt_constants';
import { useApplicationData } from '../../hooks/use_application_data';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useEnvironment } from '../../hooks/use_environment';
import { useFrustrationDashboardAvailable } from '../../hooks/use_frustration_dashboard_available';
import { useLastEnvironments } from '../../hooks/use_last_environments';
import { useTimeRange } from '../../hooks/use_time_range';
import { FrustrationPanel } from '../application_details/otel_overview/components/frustration_panel';
import {
  EMPTY_USAGE,
  usageRequestOf,
} from '../application_details/otel_overview/utils/usage_request';
import { FRUSTRATION_DESCRIPTION } from './frustration_description';
import { useFrustrationSessionSource } from './use_frustration_session_source';
import { useSaveAsDashboardMenu } from './use_save_as_dashboard_menu';

// Loaded on this page only: the dashboard bundle belongs to an optional plugin.
const FrustrationDashboard = lazy(async () => {
  const { FrustrationDashboard: component } = await import('./components/frustration_dashboard');
  return { default: component };
});

const FRUSTRATION_LABEL = i18n.translate('xpack.digitalExperience.frustration.label', {
  defaultMessage: 'Frustration',
});

const TITLE = i18n.translate('xpack.digitalExperience.frustration.title', {
  defaultMessage: 'Frustration signals',
});

const classicUnavailablePrompt = (
  <EuiPageSection paddingSize="m" restrictWidth={false}>
    <EuiEmptyPrompt
      data-test-subj="digitalExperienceFrustrationClassicUnavailable"
      iconType="cursorHand"
      title={
        <h2>
          {i18n.translate('xpack.digitalExperience.frustration.classicUnavailableTitle', {
            defaultMessage: 'The frustration dashboard needs EDOT Browser',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.digitalExperience.frustration.classicUnavailableDescription', {
            defaultMessage:
              'Frustration signals are reported by EDOT Browser with frustration detection. Instrument this application with it to see them.',
          })}
        </p>
      }
    />
  </EuiPageSection>
);

const USAGE_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.frustration.usageFetchErrorTitle',
  { defaultMessage: 'Could not load the frustration signals' }
);

const DASHBOARD_UNAVAILABLE_BODY = i18n.translate(
  'xpack.digitalExperience.frustration.dashboardUnavailable',
  { defaultMessage: 'The dashboard needs the Dashboard and Lens plugins.' }
);

const DASHBOARD_LOADING_LABEL = i18n.translate(
  'xpack.digitalExperience.frustration.dashboardLoading',
  { defaultMessage: 'Loading the frustration dashboard' }
);

// The dashboard's queries only narrow by service and environment, so the usage does too.
const usageRequest = usageRequestOf({});

const dashboardUnavailablePrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceFrustrationDashboardUnavailable"
    iconType="dashboardApp"
    body={<p>{DASHBOARD_UNAVAILABLE_BODY}</p>}
  />
);

const dashboardLoading = <EuiLoadingChart size="l" aria-label={DASHBOARD_LOADING_LABEL} />;

/**
 * The time range and environment of the page, then the native panel, whose rows open the matching
 * sessions, and the dashboard below it.
 */
function FrustrationBody({
  serviceName,
  onDashboardApiChange,
}: {
  serviceName: string;
  onDashboardApiChange: (api: DashboardApi | undefined) => void;
}) {
  const usage = useApplicationData(serviceName, usageRequest);
  const environments = useLastEnvironments(serviceName, usage.response);
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const isDashboardAvailable = useFrustrationDashboardAvailable();
  const { sessionsHref } = useApplicationLinks(serviceName, APPLICATION_SOURCE.otel);
  const [refreshCount, setRefreshCount] = useState(0);
  const sessionSource = useFrustrationSessionSource(
    Date.parse(getDateISORange({ from: timeRange.rangeFrom, to: timeRange.rangeTo }).startDate),
    [timeRange.rangeFrom, timeRange.rangeTo, environment, refreshCount].join('|')
  );

  const refreshAll = () => {
    usage.refresh();
    setRefreshCount((count) => count + 1);
  };

  const { frustration, frustratedElements, frustratedPages } = usage.response ?? EMPTY_USAGE;

  return (
    <>
      <ApplicationTabToolbar
        environments={environments}
        isLoading={usage.isLoading}
        onRefresh={refreshAll}
      />
      <EuiSpacer size="m" />
      <div data-test-subj="digitalExperienceFrustrationDashboardSlot">
        {usage.error ? (
          <LoadErrorPrompt
            data-test-subj="digitalExperienceFrustrationUsageError"
            retryDataTestSubj="digitalExperienceFrustrationUsageRetry"
            retryEbtElement={FRUSTRATION_EBT_ELEMENTS.USAGE_RETRY}
            title={USAGE_FETCH_ERROR_TITLE}
            error={usage.error}
            onRetry={usage.refresh}
          />
        ) : (
          <FrustrationPanel
            frustration={frustration}
            frustratedElements={frustratedElements}
            frustratedPages={frustratedPages}
            isLoading={usage.isLoading}
            sessionsHref={sessionsHref}
          />
        )}
        <EuiSpacer size="m" />
        {!isDashboardAvailable ? (
          dashboardUnavailablePrompt
        ) : sessionSource ? (
          <Suspense fallback={dashboardLoading}>
            <FrustrationDashboard
              serviceName={serviceName}
              environment={environment}
              sessionSource={sessionSource}
              timeRange={timeRange}
              refreshCount={refreshCount}
              onApiChange={onDashboardApiChange}
            />
          </Suspense>
        ) : (
          dashboardLoading
        )}
      </div>
    </>
  );
}

/** The frustration dashboard of an EDOT Browser application, opened from its Overview. */
export function FrustrationPage({
  serviceName,
  source,
}: {
  serviceName: string;
  source: ApplicationSource;
}) {
  const { overviewHref } = useApplicationLinks(serviceName, source);
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const menu = useSaveAsDashboardMenu(dashboardApi);

  useRouteBreadcrumb([{ text: serviceName, href: overviewHref }, { text: FRUSTRATION_LABEL }]);

  return (
    <>
      <AppHeader
        title={TITLE}
        description={FRUSTRATION_DESCRIPTION}
        back={{ href: overviewHref, label: serviceName }}
        menu={menu}
      />
      {source === APPLICATION_SOURCE.otel ? (
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          <FrustrationBody serviceName={serviceName} onDashboardApiChange={setDashboardApi} />
        </EuiPageSection>
      ) : (
        classicUnavailablePrompt
      )}
    </>
  );
}
