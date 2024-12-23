/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

import { CriteriaWithPagination } from '@elastic/eui';

import { EngineDetails } from '../../../engine/types';

export interface EnginesTableProps {
  items: EngineDetails[];
  loading: boolean;
  noItemsMessage?: ReactNode;
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    showPerPageOptions: boolean;
  };
  onChange(criteria: CriteriaWithPagination<EngineDetails>): void;
}
