/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectOverviewState } from '../../../../../state';
import { useOverviewCompactView } from './hooks/use_overview_compact_view';

export const OverviewGridCompactView = () => {
  const {
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const { columns, items, loading, getRowProps } = useOverviewCompactView();

  console.log('groupField :>> ', groupField);

  return <EuiBasicTable items={items} columns={columns} loading={loading} rowProps={getRowProps} />;
};
