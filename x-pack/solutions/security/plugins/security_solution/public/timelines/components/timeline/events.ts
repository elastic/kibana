/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveOrArrayOfPrimitives } from '../../../common/lib/kuery';
import type { DataProvider, QueryOperator } from './data_providers/data_provider';

export type {
  OnColumnSorted,
  OnColumnsSorted,
  OnColumnRemoved,
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../../../common/types/timeline';

export type OnDataProviderEdited = ({
  andProviderId,
  excluded,
  field,
  id,
  operator,
  providerId,
  value,
  type,
}: {
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  value: PrimitiveOrArrayOfPrimitives;
  type: DataProvider['type'];
}) => void;
