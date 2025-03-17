/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GroupedTable } from './grouped_table';

export interface TableSectionProps {
  /**
   *
   */
  dataView: DataView;
}

/**
 *
 */
export const TableSection = memo(({ dataView }: TableSectionProps) => {
  return <GroupedTable dataView={dataView} />;
});

TableSection.displayName = 'TableSection';
