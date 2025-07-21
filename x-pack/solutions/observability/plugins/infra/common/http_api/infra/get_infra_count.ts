/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { EntityTypeRT } from '../shared/entity_type';
import { SchemaTypesRT } from '../shared/schema_type';

export const GetInfraEntityCountRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: SchemaTypesRT,
  }),
  rt.type({
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const GetInfraEntityCountRequestParamsPayloadRT = EntityTypeRT;

export const GetInfraEntityCountResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    count: rt.number,
  }),
]);

export type GetInfraEntityCountRequestParamsPayload = rt.TypeOf<
  typeof GetInfraEntityCountRequestParamsPayloadRT
>;
export type GetInfraEntityCountRequestBodyPayload = rt.TypeOf<
  typeof GetInfraEntityCountRequestBodyPayloadRT
>;

export type GetInfraEntityCountRequestBodyPayloadClient = rt.OutputOf<
  typeof GetInfraEntityCountRequestBodyPayloadRT
>;

export type GetInfraEntityCountResponsePayload = rt.TypeOf<
  typeof GetInfraEntityCountResponsePayloadRT
>;
