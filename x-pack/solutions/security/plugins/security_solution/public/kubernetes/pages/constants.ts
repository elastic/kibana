/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnHeaderOptions } from '../../../common/types/timeline';
import { defaultColumnHeaderType } from '../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../timelines/components/timeline/body/constants';
import {
  COLUMN_SESSION_START,
  COLUMN_EXECUTABLE,
  COLUMN_ENTRY_USER,
  COLUMN_INTERACTIVE,
  COLUMN_NODE,
  COLUMN_CONTAINER,
  COLUMN_POD,
} from './translations';

export const kubernetesSessionsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.start',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
    display: COLUMN_SESSION_START,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.executable',
    display: COLUMN_EXECUTABLE,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.user.id',
    display: COLUMN_ENTRY_USER,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.entry_leader.interactive',
    display: COLUMN_INTERACTIVE,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'cloud.instance.name',
    display: COLUMN_NODE,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'orchestrator.resource.name',
    display: COLUMN_POD,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'container.name',
    display: COLUMN_CONTAINER,
  },
];
