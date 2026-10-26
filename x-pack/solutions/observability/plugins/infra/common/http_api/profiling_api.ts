/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { profilingSchemaRt } from '@kbn/profiling-utils';

// Universal Profiling (ECS) data is queried when no schema is sent
const ProfilingSchemaParamRT = rt.partial({ schema: profilingSchemaRt });

export const InfraProfilingFlamegraphRequestParamsRT = rt.intersection([
  rt.type({
    kuery: rt.string,
    from: rt.number,
    to: rt.number,
  }),
  ProfilingSchemaParamRT,
]);

export const InfraProfilingFunctionsRequestParamsRT = rt.intersection([
  rt.type({
    kuery: rt.string,
    from: rt.number,
    to: rt.number,
    startIndex: rt.number,
    endIndex: rt.number,
  }),
  ProfilingSchemaParamRT,
]);

export const InfraProfilingSchemasRequestParamsRT = rt.type({
  kuery: rt.string,
  from: rt.number,
  to: rt.number,
});

export type InfraProfilingFlamegraphRequestParams = rt.TypeOf<
  typeof InfraProfilingFlamegraphRequestParamsRT
>;

export type InfraProfilingFunctionsRequestParams = rt.TypeOf<
  typeof InfraProfilingFunctionsRequestParamsRT
>;

export type InfraProfilingSchemasRequestParams = rt.TypeOf<
  typeof InfraProfilingSchemasRequestParamsRT
>;
