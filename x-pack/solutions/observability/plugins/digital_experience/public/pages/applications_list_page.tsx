/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { getDateRange } from '@kbn/timerange';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { TimeRangePicker } from '../components/time_range_picker';
import { APPLICATIONS_LIST_EBT_ELEMENTS } from '../ebt_constants';
import { useDigitalExperienceRouter } from '../hooks/use_digital_experience_router';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';
import { APPLICATIONS_LABEL } from '../labels';

interface ApplicationRow {
  serviceName: string;
}

const NAME_COLUMN = i18n.translate('xpack.digitalExperience.applications.nameColumn', {
  defaultMessage: 'Name',
});

const LOADING_MESSAGE = i18n.translate('xpack.digitalExperience.applications.loading', {
  defaultMessage: 'Loading applications…',
});

const noApplicationsPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceApplicationsEmpty"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.applications.empty.title', {
          defaultMessage: 'No applications found',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.applications.empty.body', {
          defaultMessage:
            'There are no monitored applications for the selected time range. Try a wider time range or instrument an application.',
        })}
      </p>
    }
  />
);

const dataUnavailablePrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceApplicationsUnavailable"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.applications.unavailable.title', {
          defaultMessage: 'Applications are not available yet',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.applications.unavailable.body', {
          defaultMessage:
            'Digital experience cannot read application data in this deployment yet. Applications will appear here once it can.',
        })}
      </p>
    }
  />
);

const LoadErrorPrompt = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceApplicationsError"
    iconType="warning"
    color="danger"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.applications.fetchError', {
          defaultMessage: 'Could not load the applications',
        })}
      </h2>
    }
    body={<p>{error.message}</p>}
    actions={
      <EuiButton data-test-subj="digitalExperienceApplicationsRetry" onClick={onRetry}>
        {i18n.translate('xpack.digitalExperience.applications.retry', {
          defaultMessage: 'Try again',
        })}
      </EuiButton>
    }
  />
);

const SORT_BY_NAME = { sort: { field: 'serviceName', direction: 'asc' } } as const;

export function ApplicationsListPage() {
  const { application, ux } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const { timeRange } = useTimeRange();

  const {
    value: applications,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => {
      // Without ux (serverless) there is no Classic RUM data to request.
      if (!ux) {
        return [];
      }
      // Throws on an invalid range (e.g. `rangeFrom=foo`), which surfaces as the load error.
      const { startDate, endDate } = getDateRange({
        from: timeRange.rangeFrom,
        to: timeRange.rangeTo,
      });
      return ux.fetchClassicRumApplications({ start: startDate, end: endDate, signal });
    },
    [ux, timeRange],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!applications && !error);

  const getNoItemsMessage = () => {
    if (isLoading) {
      return LOADING_MESSAGE;
    }
    if (error) {
      return <LoadErrorPrompt error={error} onRetry={refresh} />;
    }
    return noApplicationsPrompt;
  };

  const columns = useMemo<Array<EuiBasicTableColumn<ApplicationRow>>>(
    () => [
      {
        field: 'serviceName',
        name: NAME_COLUMN,
        sortable: true,
        render: (serviceName: string) => (
          <EuiLink
            data-test-subj="digitalExperienceApplicationLink"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
              element: APPLICATIONS_LIST_EBT_ELEMENTS.APPLICATION_LINK,
            })}
            href={application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
              path: router.link('/{serviceName}', { path: { serviceName }, query: timeRange }),
            })}
          >
            {serviceName}
          </EuiLink>
        ),
      },
    ],
    [application, router, timeRange]
  );
  const items = useMemo(
    () => (applications ?? []).map((serviceName) => ({ serviceName })),
    [applications]
  );

  if (!ux) {
    return (
      <>
        <EuiPageHeader pageTitle={APPLICATIONS_LABEL} bottomBorder />
        {dataUnavailablePrompt}
      </>
    );
  }

  return (
    <>
      <EuiPageHeader pageTitle={APPLICATIONS_LABEL} bottomBorder />
      <EuiSpacer size="m" />
      <TimeRangePicker onRefresh={refresh} />
      <EuiSpacer size="m" />
      <EuiInMemoryTable<ApplicationRow>
        data-test-subj="digitalExperienceApplicationsTable"
        tableCaption={APPLICATIONS_LABEL}
        items={items}
        columns={columns}
        pagination={true}
        sorting={SORT_BY_NAME}
        loading={isLoading}
        noItemsMessage={getNoItemsMessage()}
      />
    </>
  );
}
