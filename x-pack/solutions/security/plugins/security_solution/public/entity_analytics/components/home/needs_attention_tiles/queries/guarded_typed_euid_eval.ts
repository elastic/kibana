/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL EVAL that folds `user_euid`, `host_euid`, and `service_euid` into one
 * multi-value column. `MV_APPEND` returns null if any argument is null, so each
 * call is CASE-guarded and only used when both operands are present.
 */
export const evalGuardedTypedEuids = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = CASE(`,
    '  user_euid IS NOT NULL AND host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid),',
    '  user_euid IS NOT NULL AND host_euid IS NOT NULL, MV_APPEND(user_euid, host_euid),',
    '  user_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(user_euid, service_euid),',
    '  host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(host_euid, service_euid),',
    '  user_euid IS NOT NULL, user_euid,',
    '  host_euid IS NOT NULL, host_euid,',
    '  service_euid',
    ')',
  ].join('\n');
