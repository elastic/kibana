/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingLogo, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type { ApplicationSource } from '../../../common/types/applications';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useEnvironment } from '../../hooks/use_environment';
import { useTimeRange } from '../../hooks/use_time_range';

/** Tabs of the Application view, in display order. */
const APPLICATION_TAB_IDS = ['overview'] as const;

type ApplicationTabId = (typeof APPLICATION_TAB_IDS)[number];

const APPLICATION_TAB_LABELS: Record<ApplicationTabId, string> = {
  overview: i18n.translate('xpack.digitalExperience.application.tabs.overview', {
    defaultMessage: 'Overview',
  }),
};

const overviewUnavailablePrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceOverviewEmpty"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.overview.empty.title', {
          defaultMessage: 'No overview available',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.application.overview.empty.body', {
          defaultMessage: 'The Overview for this application could not be loaded.',
        })}
      </p>
    }
  />
);

// The loading state of Observability's pages, as APM shows while it loads an embedded dashboard.
const overviewLoadingPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceOverviewLoading"
    icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.overview.loading', {
          defaultMessage: 'Loading the Overview',
        })}
      </h2>
    }
  />
);

const otelOverviewPlaceholder = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceOtelOverviewPlaceholder"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.overview.otel.title', {
          defaultMessage: 'Overview coming soon',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.application.overview.otel.body', {
          defaultMessage: 'The Overview for EDOT Browser applications is not available yet.',
        })}
      </p>
    }
  />
);

export function ApplicationPage({
  serviceName,
  source,
}: {
  serviceName: string;
  source: ApplicationSource;
}) {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();
  const { environment } = useEnvironment();

  const selectedTab: ApplicationTabId = 'overview';

  useRouteBreadcrumb([{ text: serviceName }, { text: APPLICATION_TAB_LABELS[selectedTab] }]);

  // Wrapped in an object: a component is a function, which React state would call as an updater.
  const { value: dashboard, error } = useAbortableAsync(async () => {
    if (source !== APPLICATION_SOURCE.classic || !ux) {
      return undefined;
    }
    return { Component: await ux.getClassicRumDashboard() };
  }, [ux, source]);

  const renderOverview = () => {
    if (source === APPLICATION_SOURCE.otel) {
      return otelOverviewPlaceholder;
    }
    if (dashboard) {
      return (
        <dashboard.Component
          serviceName={serviceName}
          environment={environment}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      );
    }
    // Without ux (serverless) there is no Classic RUM dashboard to show.
    if (error || !ux) {
      return overviewUnavailablePrompt;
    }
    return overviewLoadingPrompt;
  };

  return (
    <>
      <EuiPageHeader
        pageTitle={serviceName}
        bottomBorder
        tabs={APPLICATION_TAB_IDS.map((id) => ({
          label: APPLICATION_TAB_LABELS[id],
          isSelected: id === selectedTab,
          'data-test-subj': `digitalExperienceTab-${id}`,
        }))}
      />
      {renderOverview()}
    </>
  );
}
