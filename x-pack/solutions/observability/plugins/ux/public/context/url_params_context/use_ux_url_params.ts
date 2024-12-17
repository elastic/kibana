/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Assign } from '@kbn/utility-types';
import { useContext } from 'react';
import { UrlParamsContext } from './url_params_context';
import { UrlParams } from './types';

export function useUxUrlParams(): Assign<
  React.ContextType<typeof UrlParamsContext>,
  { urlParams: UrlParams }
> {
  return useContext(UrlParamsContext);
}
