/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './data_table';
export * from './header_actions';
export * from './session_view';

export const FILTER_OPEN = 'open' as const;
export const FILTER_CLOSED = 'closed' as const;
export const FILTER_ACKNOWLEDGED = 'acknowledged' as const;

export type SetEventsLoading = (params: { eventIds: string[]; isLoading: boolean }) => void;
export type SetEventsDeleted = (params: { eventIds: string[]; isDeleted: boolean }) => void;

export { TimelineTabs } from './detail_panel';
