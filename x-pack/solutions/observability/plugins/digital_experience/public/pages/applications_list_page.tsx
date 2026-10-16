/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLink,
  EuiPageHeader,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { toTimeRangeSearch, useTimeRange } from '../hooks/use_time_range';

interface ApplicationRow {
  serviceName: string;
}

const TITLE = i18n.translate('xpack.digitalExperience.applications.title', {
  defaultMessage: 'Applications',
});

const NAME_COLUMN = i18n.translate('xpack.digitalExperience.applications.nameColumn', {
  defaultMessage: 'Name',
});

export function ApplicationsListPage() {
  const { application, ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();

  const [refreshId, setRefreshId] = useState(0);
  const [applications, setApplications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { rangeFrom: from, rangeTo: to } = timeRange;

  useEffect(() => {
    if (!ux) {
      return;
    }

    const start = dateMath.parse(from)?.valueOf();
    const end = dateMath.parse(to, { roundUp: true })?.valueOf();
    if (start === undefined || end === undefined) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    ux.fetchClassicRumApplications({ start, end })
      .then((names) => !isCancelled && setApplications(names))
      .catch(() => !isCancelled && setApplications([]))
      .finally(() => !isCancelled && setIsLoading(false));

    return () => {
      isCancelled = true;
    };
  }, [ux, from, to, refreshId]);

  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      setTimeRange({ rangeFrom: start, rangeTo: end });
      setRefreshId((id) => id + 1);
    },
    [setTimeRange]
  );

  const columns: Array<EuiBasicTableColumn<ApplicationRow>> = [
    {
      field: 'serviceName',
      name: NAME_COLUMN,
      render: (serviceName: string) => (
        <EuiLink
          data-test-subj="digitalExperienceApplicationLink"
          href={application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
            path: `/${encodeURIComponent(serviceName)}${toTimeRangeSearch(timeRange)}`,
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
      <EuiPageHeader pageTitle={TITLE} bottomBorder />
      <EuiSpacer size="m" />
      {ux && (
        <>
          <EuiSuperDatePicker
            start={from}
            end={to}
            onTimeChange={onTimeChange}
            onRefresh={() => setRefreshId((id) => id + 1)}
            isLoading={isLoading}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {ux && applications.length > 0 ? (
        <EuiBasicTable<ApplicationRow>
          data-test-subj="digitalExperienceApplicationsTable"
          items={applications.map((serviceName) => ({ serviceName }))}
          columns={columns}
          loading={isLoading}
          tableCaption={TITLE}
        />
      ) : (
        emptyPrompt
      )}
    </>
  );
}
