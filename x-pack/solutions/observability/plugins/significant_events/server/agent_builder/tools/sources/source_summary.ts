/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { NightshiftSource } from '@kbn/nightshift-shared';

const SOURCE_SUMMARY_FIELDS = [
  'id',
  'slug',
  'title',
  'description',
  'tags',
  'esql',
  'type',
  'view_name',
  'enabled',
] as const;

export type SourceSummary = Pick<NightshiftSource, (typeof SOURCE_SUMMARY_FIELDS)[number]>;

/** The fields of a source that the source tools return to the agent. */
export const toSourceSummary = (source: NightshiftSource): SourceSummary =>
  pick(source, SOURCE_SUMMARY_FIELDS);
