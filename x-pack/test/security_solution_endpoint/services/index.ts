/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as xPackFunctionalServices } from '../../functional/services';
import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { EndpointTelemetryTestResourcesProvider } from './endpoint_telemetry';
import { EndpointTestResources } from './endpoint';
import { TimelineTestService } from '../../security_solution_ftr/services/timeline';
import { DetectionsTestService } from '../../security_solution_ftr/services/detections';
import { EndpointPolicyTestResourcesProvider } from './endpoint_policy';
import { EndpointArtifactsTestResources } from './endpoint_artifacts';
import { KibanaSupertestWithCertProvider } from './supertest_with_cert';

export const services = {
  ...xPackFunctionalServices,

  endpointTestResources: EndpointTestResources,
  telemetryTestResources: EndpointTelemetryTestResourcesProvider,
  ingestManager: IngestManagerProvider,
  timeline: TimelineTestService,
  detections: DetectionsTestService,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
  policyTestResources: EndpointPolicyTestResourcesProvider,
};

export const svlServices = {
  ...services,

  supertest: KibanaSupertestWithCertProvider,
};
