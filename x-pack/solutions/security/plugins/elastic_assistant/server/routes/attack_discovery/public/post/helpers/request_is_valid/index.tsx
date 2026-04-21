/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PostAttackDiscoveryGenerateRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/routes/public/post/post_attack_discovery_generate.gen';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';
import { sizeIsOutOfRange } from '@kbn/elastic-assistant-common';

import { requestHasRequiredAnonymizationParams } from '../../../../../../lib/langchain/helpers';

export const requestIsValid = ({
  alertsIndexPattern,
  request,
  size,
}: {
  alertsIndexPattern: string | undefined;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | PostAttackDiscoveryGenerateRequestBody
  >;
  size: number | undefined;
}): boolean =>
  requestHasRequiredAnonymizationParams(request) &&
  alertsIndexPattern != null &&
  size != null &&
  !sizeIsOutOfRange(size);
