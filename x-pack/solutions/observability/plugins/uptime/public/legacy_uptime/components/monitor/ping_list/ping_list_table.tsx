/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import * as I18LABELS from './translations';
import type { FailedStepsApiResponse, Ping } from '../../../../../common/runtime_types';
import { PingStatusColumn } from './columns/ping_status';
import { ERROR_LABEL, LOCATION_LABEL, RES_CODE_LABEL, TIMESTAMP_LABEL } from './translations';
import { LocationName } from './location_name';
import { MONITOR_TYPES } from '../../../../../common/constants';
import { PingTimestamp } from './columns/ping_timestamp';
import { getShortTimeStamp } from '../../overview/monitor_list/columns/monitor_status_column';
import { PingErrorCol } from './columns/ping_error';
import { FailedStep } from './columns/failed_step';
import { ResponseCodeColumn } from './columns/response_code';
import { ExpandRowColumn } from './columns/expand_row';
import { formatDuration, SpanWithMargin } from './ping_list';
import { clearPings } from '../../../state/actions';
import { pruneJourneyState } from '../../../state/actions/journey';
import type { Pagination } from '../../overview';

interface Props {
  loading?: boolean;
  pings: Ping[];
  error?: Error;
  onChange?: (criteria: any) => void;
  pagination?: Pagination;
  failedSteps?: FailedStepsApiResponse;
}

export function PingListTable({ loading, error, pings, pagination, onChange, failedSteps }: Props) {
  const history = useHistory();

  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});

  const expandedIdsToRemove = JSON.stringify(
    Object.keys(expandedRows).filter((e) => !pings.some(({ docId }) => docId === e))
  );

  const dispatch = useDispatch();

  const pruneJourneysCallback = useCallback(
    (checkGroups: string[]) => dispatch(pruneJourneyState(checkGroups)),
    [dispatch]
  );

  useEffect(() => {
    return () => {
      dispatch(clearPings());
    };
  }, [dispatch]);

  useEffect(() => {
    const parsed = JSON.parse(expandedIdsToRemove);
    if (parsed.length) {
      parsed.forEach((docId: string) => {
        delete expandedRows[docId];
      });
      setExpandedRows(expandedRows);
    }
  }, [expandedIdsToRemove, expandedRows]);

  const expandedCheckGroups = pings
    .filter((p: Ping) => Object.keys(expandedRows).some((f) => p.docId === f))
    .map(({ monitor: { check_group: cg } }) => cg);

  const expandedCheckGroupsStr = JSON.stringify(expandedCheckGroups);

  useEffect(() => {
    pruneJourneysCallback(JSON.parse(expandedCheckGroupsStr));
  }, [pruneJourneysCallback, expandedCheckGroupsStr]);

  const hasStatus = pings.reduce(
    (hasHttpStatus: boolean, currentPing) =>
      hasHttpStatus || !!currentPing.http?.response?.status_code,
    false
  );

  const hasError = pings.reduce(
    (errorType: boolean, currentPing) => errorType || !!currentPing.error?.type,
    false
  );

  const monitorType = pings?.[0]?.monitor.type;

  const columns: any[] = [
    {
      field: 'monitor.status',
      name: I18LABELS.STATUS_LABEL,
      render: (pingStatus: string, item: Ping) => (
        <PingStatusColumn pingStatus={pingStatus} item={item} />
      ),
    },
    {
      align: 'left',
      field: 'observer.geo.name',
      name: LOCATION_LABEL,
      render: (location: string) => <LocationName location={location} />,
    },
    ...(monitorType === MONITOR_TYPES.BROWSER
      ? [
          {
            align: 'left',
            field: 'timestamp',
            name: TIMESTAMP_LABEL,
            render: (timestamp: string, item: Ping) => (
              <PingTimestamp
                checkGroup={item.monitor.check_group}
                label={getShortTimeStamp(moment(timestamp))}
              />
            ),
          },
        ]
      : []),
    // ip column not needed for browser type
    ...(monitorType !== MONITOR_TYPES.BROWSER
      ? [
          {
            align: 'right',
            dataType: 'number',
            field: 'monitor.ip',
            name: i18n.translate('xpack.uptime.pingList.ipAddressColumnLabel', {
              defaultMessage: 'IP',
            }),
          },
        ]
      : []),
    {
      align: 'center',
      field: 'monitor.duration.us',
      name: i18n.translate('xpack.uptime.pingList.durationMsColumnLabel', {
        defaultMessage: 'Duration',
      }),
      render: (duration: number | null) =>
        duration ? (
          formatDuration(duration)
        ) : (
          <span data-test-subj="ping-list-duration-unavailable-tool-tip">{'--'}</span>
        ),
    },
    ...(hasError
      ? [
          {
            field: 'error.type',
            name: ERROR_LABEL,
            width: '30%',
            render: (errorType: string, item: Ping) => (
              <PingErrorCol ping={item} errorType={errorType} />
            ),
          },
        ]
      : []),
    ...(monitorType === MONITOR_TYPES.BROWSER
      ? [
          {
            field: 'monitor.status',
            align: 'left',
            name: i18n.translate('xpack.uptime.pingList.columns.failedStep', {
              defaultMessage: 'Failed step',
            }),
            render: (_timestamp: string, item: Ping) => (
              <FailedStep checkGroup={item.monitor?.check_group} failedSteps={failedSteps} />
            ),
          },
        ]
      : []),
    // Only add this column is there is any status present in list
    ...(hasStatus
      ? [
          {
            field: 'http.response.status_code',
            align: 'right',
            name: <SpanWithMargin>{RES_CODE_LABEL}</SpanWithMargin>,
            render: (statusCode: string) => <ResponseCodeColumn statusCode={statusCode} />,
          },
        ]
      : []),
    ...(monitorType !== MONITOR_TYPES.BROWSER
      ? [
          {
            align: 'right',
            width: '24px',
            isExpander: true,
            render: (item: Ping) => (
              <ExpandRowColumn
                item={item}
                expandedRows={expandedRows}
                setExpandedRows={setExpandedRows}
              />
            ),
          },
        ]
      : []),
  ];

  const getRowProps = (item: Ping) => {
    if (monitorType !== MONITOR_TYPES.BROWSER) {
      return {};
    }
    const { monitor } = item;
    return {
      height: '85px',
      'data-test-subj': `row-${monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        const targetElem = evt.target as HTMLElement;

        // we dont want to capture image click event
        if (targetElem.tagName !== 'IMG' && targetElem.tagName !== 'path') {
          history.push(`/journey/${monitor.check_group}/steps`);
        }
      },
    };
  };

  return (
    <EuiBasicTable
      loading={loading}
      columns={columns}
      error={error?.message}
      items={pings}
      itemId="docId"
      itemIdToExpandedRowMap={expandedRows}
      pagination={pagination}
      noItemsMessage={
        loading
          ? i18n.translate('xpack.uptime.pingList.pingsLoadingMesssage', {
              defaultMessage: 'Loading history...',
            })
          : i18n.translate('xpack.uptime.pingList.pingsUnavailableMessage', {
              defaultMessage: 'No history found',
            })
      }
      tableCaption={i18n.translate('xpack.uptime.pingList.pingHistoryCaption', {
        defaultMessage: 'Ping history',
      })}
      tableLayout="auto"
      rowProps={getRowProps}
      onChange={onChange}
    />
  );
}
