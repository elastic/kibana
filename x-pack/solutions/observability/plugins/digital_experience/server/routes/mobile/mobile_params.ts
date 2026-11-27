/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_CRASH_FINGERPRINT_LENGTH,
  MAX_CRASH_TYPE_LENGTH,
} from '../../../common/mobile/crash_fingerprint';
import { MAX_OS_NAME_LENGTH, MAX_RELEASE_LENGTH } from '../../lib/constants';
import {
  START_AFTER_END_ISSUE,
  isStartBeforeEnd,
  serviceNameParam,
  timeRangeShape,
  timeZoneShape,
} from '../params';

/** The mobile application page's time range and filters. */
export const mobileFiltersShape = () => ({
  ...timeRangeShape(),
  osName: z.string().min(1).max(MAX_OS_NAME_LENGTH).optional(),
  release: z.string().min(1).max(MAX_RELEASE_LENGTH).optional(),
});

/** The path and query params of the mobile application page's routes. */
export const mobileFiltersParams = () =>
  z.object({
    path: z.object({ serviceName: serviceNameParam() }),
    query: z.object(mobileFiltersShape()).refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
  });

/** The params of the mobile routes that bucket by time, in the user's time zone. */
export const mobileSeriesParams = () =>
  z.object({
    path: z.object({ serviceName: serviceNameParam() }),
    query: z
      .object({ ...mobileFiltersShape(), ...timeZoneShape() })
      .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
  });

/**
 * The params of a crash group's routes: the page's, the group's fingerprint, and its type when the
 * app knows it, an empty one for none, so only the crashes of that type are fingerprinted.
 */
export const mobileCrashGroupParams = () => {
  const { shape } = mobileFiltersParams();
  return z.object({
    path: shape.path.extend({
      fingerprint: z.string().min(1).max(MAX_CRASH_FINGERPRINT_LENGTH),
    }),
    query: z
      .object({
        ...mobileFiltersShape(),
        crashType: z.string().max(MAX_CRASH_TYPE_LENGTH).optional(),
      })
      .refine(isStartBeforeEnd, START_AFTER_END_ISSUE),
  });
};
