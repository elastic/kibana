/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOBILE_FIELDS,
  SESSIONS_METRIC,
  mappedEnvironmentFields,
  mobileStats,
} from '../../../common/mobile_panel';
import type { MappedFields } from '../../../common/mobile_panel';
import { MAX_ENVIRONMENTS } from '../constants';

/** Combinations of the two environment fields to read; each field keeps its 100 most used. */
const MAX_ENVIRONMENT_ROWS = MAX_ENVIRONMENTS * MAX_ENVIRONMENTS;

/**
 * The commands that count the documents per environment, by whichever environment fields some
 * index maps; one row with every document when none does.
 */
export const environmentsCommands = (mapped: MappedFields): string[] => {
  const fields = mappedEnvironmentFields(mapped);
  return [
    `STATS docs = COUNT(*)${fields.length > 0 ? ` BY ${fields.join(', ')}` : ''}`,
    'SORT docs DESC',
    `LIMIT ${MAX_ENVIRONMENT_ROWS}`,
  ];
};

/**
 * The commands that count the sessions per raw version (and `by`), most sessions first so a cut
 * keeps the most used; `undefined` when no index maps `service.version`.
 */
export const releasesCommands = (
  mapped: MappedFields,
  { by = [], limit }: { by?: string[]; limit: number }
): string[] | undefined =>
  mapped.has(MOBILE_FIELDS.serviceVersion)
    ? [
        ...mobileStats([SESSIONS_METRIC], mapped, {
          by: [...by, MOBILE_FIELDS.serviceVersion].join(', '),
        }),
        'SORT sessions DESC',
        `LIMIT ${limit}`,
      ]
    : undefined;
