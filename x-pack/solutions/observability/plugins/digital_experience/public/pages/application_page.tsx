/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

/** Tabs of the Application view, in display order. */
const APPLICATION_TAB_IDS = ['overview'] as const;

export type ApplicationTabId = (typeof APPLICATION_TAB_IDS)[number];

const APPLICATION_TAB_LABELS: Record<ApplicationTabId, string> = {
  overview: i18n.translate('xpack.digitalExperience.application.tabs.overview', {
    defaultMessage: 'Overview',
  }),
};

export function ApplicationPage({ serviceName }: { serviceName: string }) {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();

  const selectedTab: ApplicationTabId = 'overview';

  useRouteBreadcrumb([{ title: serviceName }, { title: APPLICATION_TAB_LABELS[selectedTab] }]);

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
      {ux ? (
        <ux.ClassicRumDashboard
          serviceName={serviceName}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      ) : (
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
                defaultMessage:
                  'The Overview for this application is not available in this deployment yet.',
              })}
            </p>
          }
        />
      )}
    </>
  );
}
