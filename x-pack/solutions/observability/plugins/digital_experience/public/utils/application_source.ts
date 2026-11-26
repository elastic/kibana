/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { APPLICATION_SOURCE } from '../../common/application_source';
import { APPLICATION_TYPES, MOBILE_PLATFORMS } from '../../common/types/applications';
import type { ApplicationSource } from '../../common/types/applications';

/** An application source in the URL; the router replaces any other value (see `routes.tsx`). */
export const applicationSourceRt = t.union([
  t.literal(APPLICATION_SOURCE.otel),
  t.literal(APPLICATION_SOURCE.classic),
]);

export const DEFAULT_APPLICATION_SOURCE: ApplicationSource = APPLICATION_SOURCE.classic;

const keysOf = <TValue extends string>(values: readonly TValue[]) =>
  t.keyof(Object.fromEntries(values.map((value) => [value, null])) as Record<TValue, null>);

/** An application type in the URL: the list's tab, or the page an application opens. */
export const applicationTypeRt = keysOf(APPLICATION_TYPES);

/** A mobile platform in the URL, of the list's platform filter. */
export const mobilePlatformRt = keysOf(MOBILE_PLATFORMS);
