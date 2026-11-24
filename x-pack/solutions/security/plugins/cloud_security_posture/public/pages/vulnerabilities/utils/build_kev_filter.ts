/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { VULNERABILITY_FIELDS } from '../../../common/constants';

/** Matches findings whose CVE is on the KEV list; `exists` would also match a stored `false`. */
export const buildKevFilter = (indexId?: string): Filter => ({
  meta: {
    key: VULNERABILITY_FIELDS.KEV_KNOWN_EXPLOITED,
    alias: null,
    disabled: false,
    negate: false,
    type: 'phrase',
    params: { query: true },
    index: indexId,
  },
  query: { match_phrase: { [VULNERABILITY_FIELDS.KEV_KNOWN_EXPLOITED]: true } },
});
