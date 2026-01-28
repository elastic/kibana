/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactText } from 'react';
import React, { useContext, useState } from 'react';
import {
  EuiBasicTable,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  EuiStat,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useJsErrorsQuery } from '../../../../hooks/use_js_errors_query';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { I18LABELS } from '../translations';
import { CsmSharedContext } from '../csm_shared_context';

interface JSErrorItem {
  errorMessage: string;
  errorGroupId: ReactText;
  count: number;
}

export function JSErrors() {
  const { http } = useKibanaServices();
  const basePath = http.basePath.get();
  const {
    urlParams: { serviceName },
  } = useLegacyUrlParams();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, loading } = useJsErrorsQuery(pagination);

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const cols = [
    {
      field: 'errorMessage',
      name: I18LABELS.errorMessage,
      render: (errorMessage: string, item: JSErrorItem) => (
        <EuiLink
          data-test-subj="uxColsLink"
          href={`${basePath}/app/apm/services/${serviceName}/errors/${item.errorGroupId}`}
        >
          {errorMessage}
        </EuiLink>
      ),
    },
    {
      name: I18LABELS.impactedPageLoads,
      field: 'count',
      align: 'right' as const,
      render: (count: number) => (
        <FormattedMessage
          id="xpack.ux.jsErrors.percent"
          defaultMessage="{pageLoadPercent} %"
          values={{
            pageLoadPercent: ((count / totalPageViews) * 100).toFixed(1),
          }}
        />
      ),
    },
  ];

  const onTableChange = ({ page }: { page: { size: number; index: number } }) => {
    setPagination({
      pageIndex: page.index,
      pageSize: page.size,
    });
  };

  const totalErrors = data?.totalErrors ?? 0;

  return (
    <>
      <EuiTitle size="xs">
        <h3>{I18LABELS.jsErrors}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj={'uxJsErrorsTotal'}
            titleSize="s"
            title={
              totalErrors < 1000 ? (
                totalErrors
              ) : (
                <EuiToolTip content={totalErrors}>
                  <span tabIndex={0}>{numeral(totalErrors).format('0 a')}</span>
                </EuiToolTip>
              )
            }
            description={I18LABELS.totalErrors}
            isLoading={!!loading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj={'uxJsErrorTable'}
        loading={!!loading}
        error={
          !loading && !data
            ? i18n.translate('xpack.ux.jsErrorsTable.errorMessage', {
                defaultMessage: 'Failed to fetch',
              })
            : ''
        }
        responsiveBreakpoint={false}
        compressed={true}
        columns={cols}
        items={data?.items ?? []}
        onChange={onTableChange}
        pagination={{
          ...pagination,
          totalItemCount: data?.totalErrorGroups ?? 0,
        }}
        tableCaption={i18n.translate('xpack.ux.jsErrors.tableCaption', {
          defaultMessage: 'JS errors',
        })}
      />
    </>
  );
}
