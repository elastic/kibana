/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

/** A size in bytes with its unit, e.g. `4 KB`. */
export const formatBytes = (bytes: number): string => {
  return numeral(bytes).format('0.[0] b');
};
