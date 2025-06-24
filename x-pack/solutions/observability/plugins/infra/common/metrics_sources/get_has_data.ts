/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const getHasDataQueryParamsRT = rt.partial({
  // Integrations `event.module` value
  modules: rt.union([rt.string, rt.array(rt.string)]),
});

export const getHasDataResponseRT = rt.partial({
  hasData: rt.boolean,
});

export type GetHasDataQueryParams = rt.TypeOf<typeof getHasDataQueryParamsRT>;
export type GetHasDataResponse = rt.TypeOf<typeof getHasDataResponseRT>;
