/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer, useState } from 'react';
import { EuiBasicTable, EuiEmptyPrompt, EuiLink, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
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

const FETCH_ERROR_TITLE = i18n.translate('xpack.digitalExperience.applications.fetchError', {
  defaultMessage: 'Could not load the applications',
});

export function ApplicationsListPage() {
  const { application, notifications, ux } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const { timeRange } = useTimeRange();

  // Bumped by the picker's Refresh button to fetch again with the same range.
  const [refreshCount, refresh] = useReducer((count: number) => count + 1, 0);
  const [applications, setApplications] = useState<string[]>([]);
  // Starts loading so the first render shows the loading table, not the empty prompt.
  const [isLoading, setIsLoading] = useState(Boolean(ux));

  const { rangeFrom: from, rangeTo: to } = timeRange;

  useEffect(() => {
    if (!ux) {
      return;
    }

    const start = dateMath.parse(from)?.valueOf();
    const end = dateMath.parse(to, { roundUp: true })?.valueOf();
    if (start === undefined || end === undefined) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setIsLoading(true);
    ux.fetchClassicRumApplications({ start, end, signal })
      .then((names) => !signal.aborted && setApplications(names))
      .catch((error: Error) => {
        if (signal.aborted) {
          return;
        }
        setApplications([]);
        notifications.toasts.addError(error, { title: FETCH_ERROR_TITLE });
      })
      .finally(() => !signal.aborted && setIsLoading(false));

    return () => controller.abort();
  }, [ux, notifications, from, to, refreshCount]);

  const columns: Array<EuiBasicTableColumn<ApplicationRow>> = [
    {
      field: 'serviceName',
      name: NAME_COLUMN,
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
  ];

  const emptyPrompt = (
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

  return (
    <>
      <EuiPageHeader pageTitle={APPLICATIONS_LABEL} bottomBorder />
      <EuiSpacer size="m" />
      {ux && (
        <>
          <TimeRangePicker onRefresh={refresh} />
          <EuiSpacer size="m" />
        </>
      )}
      {ux && (isLoading || applications.length > 0) ? (
        <EuiBasicTable<ApplicationRow>
          data-test-subj="digitalExperienceApplicationsTable"
          items={applications.map((serviceName) => ({ serviceName }))}
          columns={columns}
          loading={isLoading}
          tableCaption={APPLICATIONS_LABEL}
        />
      ) : (
        emptyPrompt
      )}
    </>
  );
}
