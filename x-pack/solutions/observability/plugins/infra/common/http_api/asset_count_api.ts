/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { AssetTypeRT } from './shared/asset_type';

export const GetInfraAssetCountRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
  }),
  rt.type({
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const GetInfraAssetCountRequestParamsPayloadRT = AssetTypeRT;

export const GetInfraAssetCountResponsePayloadRT = rt.intersection([
  AssetTypeRT,
  rt.type({
    count: rt.number,
  }),
]);

export type GetInfraAssetCountRequestParamsPayload = rt.TypeOf<
  typeof GetInfraAssetCountRequestParamsPayloadRT
>;
export type GetInfraAssetCountRequestBodyPayload = rt.TypeOf<
  typeof GetInfraAssetCountRequestBodyPayloadRT
>;

export type GetInfraAssetCountRequestBodyPayloadClient = rt.OutputOf<
  typeof GetInfraAssetCountRequestBodyPayloadRT
>;

export type GetInfraAssetCountResponsePayload = rt.TypeOf<
  typeof GetInfraAssetCountResponsePayloadRT
>;
