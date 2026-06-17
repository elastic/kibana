/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataSchemaFormatEnum } from '@kbn/metrics-data-access-plugin/common';
import * as rt from 'io-ts';

export const DataSchemaFormatRT = rt.keyof({
  [`${DataSchemaFormatEnum.ECS}`]: null,
  [`${DataSchemaFormatEnum.SEMCONV}`]: null,
});
