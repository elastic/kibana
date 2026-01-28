/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useExpandedPingList } from './use_ping_expanded';
import { formatDuration } from '../../../../utils/formatting';
import type { Ping } from '../../../../../../../common/runtime_types';
import * as I18LABELS from './translations';
import { PingStatusColumn } from './columns/ping_status';
import { ERROR_LABEL, LOCATION_LABEL, RES_CODE_LABEL } from './translations';
import { PingErrorCol } from './columns/ping_error';
import { ResponseCodeColumn } from './columns/response_code';
import { ExpandRowColumn } from './columns/expand_row';

interface Props {
  loading?: boolean;
  pings: Ping[];
  error?: Error;
  onChange?: (criteria: any) => void;
}

export function PingListTable({ loading, error, pings, onChange }: Props) {
  const { expandedRows, setExpandedRows } = useExpandedPingList(pings);

  const hasStatus = pings.reduce(
    (hasHttpStatus: boolean, currentPing) =>
      hasHttpStatus || !!currentPing.http?.response?.status_code,
    false
  );

  const hasError = pings.reduce(
    (errorType: boolean, currentPing) => errorType || !!currentPing.error?.type,
    false
  );

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
    },
    {
      align: 'right',
      field: 'monitor.ip',
      name: i18n.translate('xpack.synthetics.pingList.ipAddressColumnLabel', {
        defaultMessage: 'IP',
      }),
    },
    {
      align: 'center',
      field: 'monitor.duration.us',
      name: i18n.translate('xpack.synthetics.pingList.durationMsColumnLabel', {
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
  ];

  return (
    <EuiBasicTable
      loading={loading}
      columns={columns}
      error={error?.message}
      items={pings}
      itemId="docId"
      itemIdToExpandedRowMap={expandedRows}
      noItemsMessage={
        loading
          ? i18n.translate('xpack.synthetics.pingList.pingsLoadingMesssage', {
              defaultMessage: 'Loading history...',
            })
          : i18n.translate('xpack.synthetics.pingList.pingsUnavailableMessage', {
              defaultMessage: 'No history found',
            })
      }
      tableCaption={i18n.translate('xpack.synthetics.pingList.pingListCaption', {
        defaultMessage: 'Ping history',
      })}
      tableLayout="auto"
      onChange={onChange}
    />
  );
}

export const SpanWithMargin = styled.span`
  margin-right: 16px;
`;
