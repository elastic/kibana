/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  SERVICE_ENVIRONMENT,
} from '@kbn/apm-types';
import { termQuery } from '@kbn/es-query';

/**
 * Documents without an environment, as APM's `environmentQuery` defines them: the "Not defined"
 * sentinel APM writes, or none of `fields` set.
 */
export const environmentNotDefinedFilter = (fields: string[]) => ({
  bool: {
    should: [
      ...termQuery(SERVICE_ENVIRONMENT, ENVIRONMENT_NOT_DEFINED_VALUE),
      { bool: { must_not: fields.map((field) => ({ exists: { field } })) } },
    ],
    minimum_should_match: 1,
  },
});

/** Documents of `environment` in any of `fields`; everything for all environments. */
export const environmentFilter = (fields: string[], environment?: string) => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return { match_all: {} };
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return environmentNotDefinedFilter(fields);
  }
  return {
    bool: {
      should: fields.flatMap((field) => termQuery(field, environment)),
      minimum_should_match: 1,
    },
  };
};

/**
 * The environment names, plus the "Not defined" sentinel when some documents have none (whatever
 * the terms aggregations returned); the caller orders them.
 */
export const withNotDefined = (environments: string[], notDefinedCount: number): string[] => {
  const names = environments.filter((name) => name !== ENVIRONMENT_NOT_DEFINED_VALUE);
  return notDefinedCount > 0 ? [...names, ENVIRONMENT_NOT_DEFINED_VALUE] : names;
};
