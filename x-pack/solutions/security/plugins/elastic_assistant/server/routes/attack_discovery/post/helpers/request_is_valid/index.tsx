/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import {
  AttackDiscoveryPostRequestBody,
  ExecuteConnectorRequestBody,
  sizeIsOutOfRange,
} from '@kbn/elastic-assistant-common';

import { requestHasRequiredAnonymizationParams } from '../../../../../lib/langchain/helpers';

export const requestIsValid = ({
  alertsIndexPattern,
  request,
  size,
}: {
  alertsIndexPattern: string | undefined;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
  >;
  size: number | undefined;
}): boolean =>
  requestHasRequiredAnonymizationParams(request) &&
  alertsIndexPattern != null &&
  size != null &&
  !sizeIsOutOfRange(size);
