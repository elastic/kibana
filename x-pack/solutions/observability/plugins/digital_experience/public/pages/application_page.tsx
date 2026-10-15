/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDigitalExperienceBreadcrumbs } from '../hooks/use_digital_experience_breadcrumbs';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

export type ApplicationTabId = 'overview';

interface ApplicationTab {
  id: ApplicationTabId;
  label: string;
}

const APPLICATION_TABS: readonly ApplicationTab[] = [
  {
    id: 'overview',
    label: i18n.translate('xpack.digitalExperience.application.tabs.overview', {
      defaultMessage: 'Overview',
    }),
  },
] as const;

export function ApplicationPage({ serviceName }: { serviceName: string }) {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();
  useDigitalExperienceBreadcrumbs({ serviceName, timeRange });

  const selectedTab: ApplicationTabId = 'overview';

  return (
    <>
      <EuiPageHeader
        pageTitle={serviceName}
        bottomBorder
        tabs={APPLICATION_TABS.map(({ id, label }) => ({
          label,
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
