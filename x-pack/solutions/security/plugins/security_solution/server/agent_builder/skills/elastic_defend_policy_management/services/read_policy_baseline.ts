/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { createDefaultPolicy } from '../../../../fleet_integration/handlers/create_default_policy';
import { hashPolicyConfig } from '../domain/hash_policy_config';
import { normalize } from '../domain/normalize_policy_config';
import type {
  EndpointPolicyBaseline,
  EndpointPolicyBaselinePreset,
} from '../domain/normalized_endpoint_policy';
import { summarizeEndpointPolicy } from '../domain/normalized_endpoint_policy';
import { resolveDefaultPolicyEnvironment } from './resolve_default_policy_environment';

export const readPolicyBaseline = (
  endpointAppContextService: EndpointAppContextService,
  args: Readonly<{ preset: EndpointPolicyBaselinePreset }>
): EndpointPolicyBaseline => {
  const environment = resolveDefaultPolicyEnvironment(endpointAppContextService);

  const config = createDefaultPolicy(
    endpointAppContextService.getLicenseService(),
    { type: 'endpoint', endpointConfig: { preset: args.preset } },
    endpointAppContextService.getCloudSetup(),
    undefined as unknown as InfoResponse,
    endpointAppContextService.getProductFeaturesService(),
    endpointAppContextService.getTelemetryConfigProvider(),
    endpointAppContextService.experimentalFeatures
  );

  const normalizedConfig = normalize(config);

  return {
    kind: 'baseline',
    preset: args.preset,
    environment,
    normalizedConfig,
    normalizedHash: hashPolicyConfig(normalizedConfig),
    summary: summarizeEndpointPolicy(normalizedConfig),
  };
};
