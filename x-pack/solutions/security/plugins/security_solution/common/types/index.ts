/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Status } from '../api/detection_engine';

export * from './timeline';
export type * from './header_actions';
export type * from './bulk_actions';

// Hardcoded list of reasons for closing alerts
export const DefaultClosingReasonSchema = z.enum([
  'false_positive',
  'duplicate',
  'true_positive',
  'benign_positive',
  'automated_closure',
  'other',
]);

// It's possible for users to supply custom reasons
const AlertClosingReasonSchema = z.union([DefaultClosingReasonSchema, z.string()]);
export type AlertClosingReason = z.infer<typeof AlertClosingReasonSchema>;
export const AlertDefaultClosingReasonValues = DefaultClosingReasonSchema.enum;

export const FILTER_OPEN: Status = 'open';
export const FILTER_CLOSED: Status = 'closed';
export const FILTER_ACKNOWLEDGED: Status = 'acknowledged';

export type SetEventsLoading = (params: { eventIds: string[]; isLoading: boolean }) => void;
export type SetEventsDeleted = (params: { eventIds: string[]; isDeleted: boolean }) => void;
