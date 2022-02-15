/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as xPackFunctionalServices } from '../../functional/services';
import { EndpointPolicyTestResourcesProvider } from './endpoint_policy';
import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { EndpointTelemetryTestResourcesProvider } from './endpoint_telemetry';
import { EndpointTestResources } from './endpoint';
import { EndpointArtifactsTestResources } from './endpoint_artifacts';

export const services = {
  ...xPackFunctionalServices,
  endpointTestResources: EndpointTestResources,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
  policyTestResources: EndpointPolicyTestResourcesProvider,
  telemetryTestResources: EndpointTelemetryTestResourcesProvider,
  ingestManager: IngestManagerProvider,
};
