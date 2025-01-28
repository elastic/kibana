/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { MostRecentPingsRequest } from './api';
import { Ping, PingsResponse, SyntheticsMonitorWithId } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const setMonitorDetailsLocationAction = createAction<string>(
  '[MONITOR SUMMARY] SET LOCATION'
);

export const getMonitorAction = createAsyncAction<
  { monitorId: string; spaceId?: string },
  SyntheticsMonitorWithId
>('[MONITOR DETAILS] GET MONITOR');

export const getMonitorLastRunAction = createAsyncAction<
  { monitorId: string; locationLabel: string },
  { ping?: Ping }
>('[MONITOR DETAILS] GET LAST RUN');

export const resetMonitorLastRunAction = createAction('[MONITOR DETAILS] LAST RUN RESET');

export const updateMonitorLastRunAction = createAction<{ data: Ping }>(
  '[MONITOR DETAILS] UPdATE LAST RUN'
);

export const getMonitorRecentPingsAction = createAsyncAction<MostRecentPingsRequest, PingsResponse>(
  '[MONITOR DETAILS] GET RECENT PINGS'
);

export const setStatusFilter = createAction<'up' | 'down' | undefined>('SET STATUS FILTER');
