/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { isValidTimeRange, useTimeRange } from '../hooks/use_time_range';

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

export function ApplicationPage({ serviceName }: { serviceName: string }) {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();

  const selectedTab: ApplicationTabId = 'overview';

  useRouteBreadcrumb([{ text: serviceName }, { text: APPLICATION_TAB_LABELS[selectedTab] }]);

  // Wrapped in an object: a component is a function, which React state would call as an updater.
  const { value: dashboard, error } = useAbortableAsync(async () => {
    if (!ux) {
      return undefined;
    }
    return { Component: await ux.getClassicRumDashboard() };
  }, [ux]);

  const renderOverview = () => {
    if (dashboard) {
      return (
        <dashboard.Component
          serviceName={serviceName}
          // An invalid range is left out, so the dashboard falls back to the global timefilter.
          timeRange={isValidTimeRange(timeRange) ? timeRange : undefined}
          onTimeRangeChange={setTimeRange}
        />
      );
    }
    // Without ux (serverless) there is no Classic RUM dashboard to show.
    if (error || !ux) {
      return overviewUnavailablePrompt;
    }
    return <EuiLoadingSpinner size="xl" />;
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
