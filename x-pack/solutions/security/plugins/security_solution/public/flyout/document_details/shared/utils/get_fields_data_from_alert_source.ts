/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFieldsData } from '../hooks/use_get_fields_data';
import { ecsSliceToFlattenedDocument } from './ecs_slice_to_flattened_document';

/**
 * Builds a {@link GetFieldsData} reader from alert/event `_source` so entity insight resolution
 * (`resolveHostNameForEntityInsightsWithFallback`, etc.) can read `host.name`, `user.name`, and
 * `@timestamp` the same way as document-details insights do via indexed fields.
 */
export const createGetFieldsDataFromAlertSource = (
  source: Record<string, unknown> | undefined
): GetFieldsData => {
  const flat: Record<string, string> = {};

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const host = source.host;
    const user = source.user;
    if (host && typeof host === 'object' && !Array.isArray(host)) {
      Object.assign(flat, ecsSliceToFlattenedDocument('host', host as object));
    }
    if (user && typeof user === 'object' && !Array.isArray(user)) {
      Object.assign(flat, ecsSliceToFlattenedDocument('user', user as object));
    }
    const ts = source['@timestamp'];
    if (typeof ts === 'string') {
      flat['@timestamp'] = ts;
    }
  }

  return (field: string) => flat[field] ?? undefined;
};
