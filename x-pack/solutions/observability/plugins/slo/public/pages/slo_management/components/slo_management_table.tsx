/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Criteria, EuiBasicTable, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';

export function SloManagementTable() {
  //   const [query, setQuery] = useState<string>();
  //   const [filters, setFilters] = useState<Filter[]>([]);
  //   const [statusFilter, setStatusFilter] = useState<Filter>();
  //   const [sortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { isLoading, isError, data } = useFetchSloDefinitions({});

  //   const columns: unknown = [];

  const onTableChange = ({ page }: Criteria<unknown>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiSpacer size="m" />
      {!isLoading && !isError && !!data?.results && (
        <EuiBasicTable
          tableCaption={TABLE_CAPTION}
          items={data?.results ?? []}
          rowHeader="status"
          columns={[]}
          pagination={pagination}
          onChange={onTableChange}
        />
      )}
    </EuiPanel>
  );
}

const TABLE_CAPTION = i18n.translate('xpack.slo.sloHealthPanel.tableCaption', {
  defaultMessage: 'SLOs Health',
});
