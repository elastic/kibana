/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { SupportedEntityTypesRT } from '../http_api/shared/entity_type';

export const getHasDataQueryParamsRT = rt.partial({
  entityType: SupportedEntityTypesRT,
});

export const getHasDataResponseRT = rt.partial({
  hasData: rt.boolean,
});

export const getTimeRangeMetadataQueryParamsRT = rt.intersection([
  rt.partial({
    kuery: rt.string,
  }),
  rt.type({
    dataSource: SupportedEntityTypesRT,
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

export const getTimeRangeMetadataResponseRT = rt.type({
  schemas: rt.array(
    rt.keyof({
      ecs: null,
      semconv: null,
    })
  ),
});

export type GetHasDataQueryParams = rt.TypeOf<typeof getHasDataQueryParamsRT>;
export type GetHasDataResponse = rt.TypeOf<typeof getHasDataResponseRT>;
export type GetTimeRangeMetadataQueryParams = rt.TypeOf<typeof getTimeRangeMetadataQueryParamsRT>;
export type GetTimeRangeMetadataResponse = rt.TypeOf<typeof getTimeRangeMetadataResponseRT>;
