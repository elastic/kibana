/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { APPLICATION_SOURCE } from '../../common/application_source';
import { APPLICATION_PLATFORMS } from '../../common/types/applications';
import type { ApplicationPlatform, ApplicationSource } from '../../common/types/applications';

/** An application source in the URL; the router replaces any other value (see `routes.tsx`). */
export const applicationSourceRt = t.union([
  t.literal(APPLICATION_SOURCE.otel),
  t.literal(APPLICATION_SOURCE.classic),
]);

export const DEFAULT_APPLICATION_SOURCE: ApplicationSource = APPLICATION_SOURCE.classic;

/**
 * An application platform in the URL: of the application, whose mobile ones have the mobile page,
 * or of the list's platform filter.
 */
export const applicationPlatformRt = t.keyof(
  Object.fromEntries(APPLICATION_PLATFORMS.map((platform) => [platform, null])) as Record<
    ApplicationPlatform,
    null
  >
);
