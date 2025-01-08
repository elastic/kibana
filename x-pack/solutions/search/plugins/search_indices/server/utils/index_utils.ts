/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexState } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export function isHidden(index: IndicesIndexState): boolean {
  return index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';
}

export function isClosed(index: IndicesIndexState): boolean {
  return (
    index.settings?.index?.verified_before_close === true ||
    index.settings?.index?.verified_before_close === 'true'
  );
}
