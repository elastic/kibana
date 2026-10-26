/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import { ConfigKey } from '../../../common/constants/monitor_management';

/**
 * Attribute names stored on a monitor saved object: every ConfigKey, `secrets`
 * (the packed secretKeys payload) and `retest_on_failure`, which the monitor
 * codecs add outside ConfigKey.
 */
export const MONITOR_ATTRIBUTE_KEYS: string[] = [
  ...Object.values(ConfigKey),
  'secrets',
  'retest_on_failure',
];

// Only the keys are checked. The routes already validate values, and a value check
// here could reject a document that was stored earlier: a space change deletes the
// saved object before it creates it again, and after a rollback one rejected
// document fails the whole find request.
const props = Object.fromEntries(
  MONITOR_ATTRIBUTE_KEYS.map((key) => [key, schema.maybe(schema.any())])
) as Record<string, Type<unknown>>;

/** Rejects an attribute this version does not store. */
export const monitorCreateSchema = schema.object(props, { unknowns: 'forbid' });

/** Drops attributes a later version added, so a rolled-back release can still save the monitor. */
export const monitorForwardCompatibilitySchema = schema.object(props, { unknowns: 'ignore' });
