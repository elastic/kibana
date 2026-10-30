/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { ProfilingSchema } from '@kbn/profiling-utils';

export interface FlamegraphLocatorParams extends SerializableRecord {
  kuery?: string;
  rangeFrom?: string;
  rangeTo?: string;
  schema?: ProfilingSchema;
}

export type FlamegraphLocator = LocatorPublic<FlamegraphLocatorParams>;

export class FlamegraphLocatorDefinition implements LocatorDefinition<FlamegraphLocatorParams> {
  public readonly id = 'flamegraphLocator';

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    kuery,
    schema,
  }: FlamegraphLocatorParams) => {
    const params = { rangeFrom, rangeTo, kuery, schema };
    return {
      app: 'profiling',
      path: `/flamegraphs/flamegraph?${qs.stringify(params)}`,
      state: {},
    };
  };
}
