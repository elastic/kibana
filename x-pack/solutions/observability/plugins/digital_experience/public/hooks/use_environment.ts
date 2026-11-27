/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-types';
import { useQueryParam } from './use_query_param';

/** Environment from the `environment` URL param, `undefined` for all environments. */
export const useEnvironment = (): {
  environment: string | undefined;
  setEnvironment: (environment: string | undefined) => void;
} => {
  const { value, setValue: setEnvironment } = useQueryParam('environment');
  // `ENVIRONMENT_ALL` filters nothing, like an unset param.
  const environment = value === ENVIRONMENT_ALL_VALUE ? undefined : value;
  return { environment, setEnvironment };
};
