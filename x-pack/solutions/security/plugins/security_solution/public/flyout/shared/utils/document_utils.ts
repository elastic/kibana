/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';

/**
 * Returns true if the document is a detection alert (event.kind is 'signal').
 */
export const isAlert = (hit: DataTableRecord): boolean =>
  (getFieldValue(hit, EVENT_KIND) as string) === 'signal';
