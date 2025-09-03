/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { SvlCommonApiServiceProvider } from '@kbn/test-suites-xpack-platform/serverless/shared/services/svl_common_api';
import { IngestManagerProvider } from '@kbn/test-suites-xpack-platform/api_integration/services/ingest_manager';
import { services as platformServices } from '@kbn/test-suites-xpack-platform/functional/services';
import { EndpointTelemetryTestResourcesProvider } from './endpoint_telemetry';
import { EndpointTestResourcesProvider } from './endpoint';
import { TimelineTestServiceProvider } from './timeline';
import { DetectionsTestServiceProvider } from './detections';
import { EndpointPolicyTestResourcesProvider } from './endpoint_policy';
import { EndpointArtifactsTestResourcesProvider } from './endpoint_artifacts';
import {
  KibanaSupertestWithCertProvider,
  KibanaSupertestWithCertWithoutAuthProvider,
} from './supertest_with_cert';
import { SecuritySolutionEndpointDataStreamHelpers } from './endpoint_data_stream_helpers';
import { SecuritySolutionEndpointRegistryHelpers } from './endpoint_registry_helpers';

export const services = {
  ...platformServices,

  endpointTestResources: EndpointTestResourcesProvider,
  telemetryTestResources: EndpointTelemetryTestResourcesProvider,
  ingestManager: IngestManagerProvider,
  timeline: TimelineTestServiceProvider,
  detections: DetectionsTestServiceProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResourcesProvider,
  policyTestResources: EndpointPolicyTestResourcesProvider,
  endpointDataStreamHelpers: SecuritySolutionEndpointDataStreamHelpers,
  endpointRegistryHelpers: SecuritySolutionEndpointRegistryHelpers,
};

export const svlServices = {
  ...services,

  supertest: KibanaSupertestWithCertProvider,
  supertestWithoutAuth: KibanaSupertestWithCertWithoutAuthProvider,

  svlCommonApi: SvlCommonApiServiceProvider,
  svlUserManager: commonFunctionalServices.samlAuth,
};

export type Services = typeof services | typeof svlServices;
