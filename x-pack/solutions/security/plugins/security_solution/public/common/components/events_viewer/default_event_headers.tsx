/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnHeaderOptions } from '../../../../common/types';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';

export const defaultEventHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
    esTypes: ['date'],
    type: 'date',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.type',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.dataset',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
  },
];

/**
 * Default columns for Hosts Events table and embeddable.
 * Includes all fields required by the Host entity identifier (host.entity.id, host.id, host.name, host.domain, host.hostname).
 */
export const hostEventsDefaultHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
    esTypes: ['date'],
    type: 'date',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'message',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.id',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.domain',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.hostname',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'agent.type',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.dataset',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
  },
];
