/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';

export enum DataSchemaFormat {
  ECS = 'ecs',
  SEMCONV = 'semconv',
}

export const DataSchemaFormatRT = rt.keyof({
  [DataSchemaFormat.ECS]: null,
  [DataSchemaFormat.SEMCONV]: null,
});
