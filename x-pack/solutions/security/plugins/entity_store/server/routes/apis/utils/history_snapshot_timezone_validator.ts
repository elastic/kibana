/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import moment from 'moment-timezone';

const isValidTimezone = (timezone: string): boolean => moment.tz.zone(timezone) != null;

export const validateHistorySnapshotTimezone =
  ({ isOptional }: { isOptional: boolean }) =>
  (data: { timezone?: string } | undefined, ctx: z.RefinementCtx): void => {
    const { timezone } = data ?? {};

    if (timezone === undefined) {
      if (!isOptional) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['timezone'],
          message: 'timezone is required',
        });
      }
      return;
    }

    if (timezone.trim() === '' || !isValidTimezone(timezone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timezone'],
        message: 'must be a valid timezone (e.g. America/New_York)',
      });
    }
  };
