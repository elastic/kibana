/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';

import type { InferenceEndpointUI } from './types';

interface EndpointsTableProps {
  columns: EuiBasicTableProps<InferenceEndpointUI>['columns'];
  data: InferenceEndpointUI[];
  onChange: EuiBasicTableProps<InferenceEndpointUI>['onChange'];
  pagination: Pagination;
  sorting: EuiBasicTableProps<InferenceEndpointUI>['sorting'];
}

export const EndpointsTable: React.FC<EndpointsTableProps> = ({
  columns,
  data,
  onChange,
  pagination,
  sorting,
}) => {
  return (
    <EuiBasicTable
      columns={columns}
      itemId="id"
      items={data}
      onChange={onChange}
      pagination={pagination}
      sorting={sorting}
    />
  );
};
