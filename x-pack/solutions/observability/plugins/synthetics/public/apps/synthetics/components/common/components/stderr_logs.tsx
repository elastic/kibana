/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  formatDate,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiInMemoryTable } from '@elastic/eui';
import moment from 'moment';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useStdErrorLogs } from './use_std_error_logs';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import type { Ping } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';

export const StdErrorLogs = ({
  checkGroup,
  timestamp,
  title,
  summaryMessage,
  hideTitle = false,
  pageSize = 5,
}: {
  checkGroup?: string;
  timestamp?: string;
  title?: string;
  summaryMessage?: string;
  hideTitle?: boolean;
  pageSize?: number;
}) => {
  const columns = [
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
      sortable: true,
      render: (date: string) => formatDate(date, 'dateTime'),
    },
    {
      field: 'synthetics.type',
      name: TYPE_LABEL,
      sortable: true,
    },
    {
      field: 'synthetics.payload.message',
      name: 'Message',
      render: (message: string) => (
        <EuiHighlight
          search={message.includes('SyntaxError:') ? 'SyntaxError:' : 'ReferenceError:'}
        >
          {message}
        </EuiHighlight>
      ),
    },
  ] as Array<EuiBasicTableColumn<Ping>>;

  const { items, loading } = useStdErrorLogs({ checkGroup });

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const onTableChange = ({ page }: CriteriaWithPagination<(typeof items)[number]>) => {
    setPagination({ pageIndex: page.index, pageSize: page.size });
  };

  const { discover, exploratoryView } = useKibana<ClientPluginsStart>().services;

  const { data: discoverLink } = useFetcher(async () => {
    const dataView = await exploratoryView.getAppDataView('synthetics', SYNTHETICS_INDEX_PATTERN);
    return discover.locator?.getUrl({
      query: { language: 'kuery', query: `monitor.check_group: ${checkGroup}` },
      indexPatternId: dataView?.id,
      columns: ['synthetics.payload.message', 'error.message'],
      timeRange: timestamp
        ? {
            from: moment(timestamp).subtract(10, 'minutes').toISOString(),
            to: moment(timestamp).add(5, 'minutes').toISOString(),
          }
        : undefined,
    });
  }, [checkGroup, timestamp, discover, exploratoryView]);

  const search = {
    box: {
      incremental: true,
    },
  };

  return (
    <>
      {!hideTitle && (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>{title ?? TEST_RUN_LOGS_LABEL}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink data-test-subj="syntheticsStdErrorLogsLink">
                <EuiButtonEmpty
                  data-test-subj="syntheticsStdErrorLogsButton"
                  href={discoverLink}
                  iconType="discoverApp"
                  isDisabled={!discoverLink}
                >
                  {VIEW_IN_DISCOVER_LABEL}
                </EuiButtonEmpty>
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          {summaryMessage && (
            <EuiCallOut
              announceOnMount
              title={ERROR_SUMMARY_LABEL}
              color="danger"
              iconType="warning"
            >
              <p>{summaryMessage}</p>
            </EuiCallOut>
          )}
        </>
      )}

      <EuiSpacer />

      <EuiInMemoryTable
        items={items}
        rowHeader="@timestamp"
        columns={columns}
        tableLayout="auto"
        loading={loading}
        search={search}
        itemId="id"
        executeQueryOptions={{
          defaultFields: ['@timestamp', 'synthetics.payload.message'],
        }}
        pagination={{
          ...pagination,
          pageSizeOptions: [2, 5, 10, 20, 50],
        }}
        onTableChange={onTableChange}
        tableCaption={title ?? TEST_RUN_LOGS_LABEL}
      />
    </>
  );
};

export const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.monitorList.timestamp', {
  defaultMessage: 'Timestamp',
});

export const TYPE_LABEL = i18n.translate('xpack.synthetics.monitorList.type', {
  defaultMessage: 'Type',
});

export const ERROR_SUMMARY_LABEL = i18n.translate('xpack.synthetics.monitorList.errorSummary', {
  defaultMessage: 'Error summary',
});

export const VIEW_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.viewInDiscover',
  {
    defaultMessage: 'View in discover',
  }
);

export const TEST_RUN_LOGS_LABEL = i18n.translate('xpack.synthetics.monitorList.testRunLogs', {
  defaultMessage: 'Test run logs',
});
