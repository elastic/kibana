/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryParam } from './use_query_param';

/** Environment from the `environment` URL param, `undefined` for all environments. */
export const useEnvironment = (): {
  environment: string | undefined;
  setEnvironment: (environment: string | undefined) => void;
} => {
  const { value: environment, setValue: setEnvironment } = useQueryParam('environment');
  return { environment, setEnvironment };
};
