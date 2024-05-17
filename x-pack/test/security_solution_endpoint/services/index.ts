/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestManagerProvider } from '../../common/services/ingest_manager';
import { services as xPackFunctionalServices } from '../../functional/services';
import { DetectionsTestService } from '../../security_solution_ftr/services/detections';
import { TimelineTestService } from '../../security_solution_ftr/services/timeline';
import { EndpointTestResources } from './endpoint';
import { EndpointArtifactsTestResources } from './endpoint_artifacts';
import { EndpointPolicyTestResourcesProvider } from './endpoint_policy';
import { EndpointTelemetryTestResourcesProvider } from './endpoint_telemetry';
import {
  KibanaSupertestWithCertProvider,
  KibanaSupertestWithCertWithoutAuthProvider,
} from './supertest_with_cert';

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
  supertestWithoutAuth: KibanaSupertestWithCertWithoutAuthProvider,
};
