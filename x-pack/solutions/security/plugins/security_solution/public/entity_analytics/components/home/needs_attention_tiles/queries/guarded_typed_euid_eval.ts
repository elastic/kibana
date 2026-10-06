/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL EVAL that folds `user_euid`, `host_euid`, and `service_euid` into one
 * multi-value column of the ids that are present. `MV_APPEND` returns null if any
 * argument is null, so each argument is a COALESCE that is null only when all three
 * ids are; MV_DEDUPE drops the repeats that come from the fallbacks.
 *
 * A multi-condition CASE would do the same, but ES|QL evaluates it one row at a time,
 * which made this EVAL most of the cost of the alerts tile.
 */
export const evalGuardedTypedEuids = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = MV_DEDUPE(MV_APPEND(MV_APPEND(`,
    '  COALESCE(user_euid, host_euid, service_euid),',
    '  COALESCE(host_euid, service_euid, user_euid)),',
    '  COALESCE(service_euid, user_euid, host_euid)))',
  ].join('\n');
