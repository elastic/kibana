/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IS_MANAGED_OTLP_SERVICE_ENABLED = 'observability.managedOtlpServiceEnabled';
export const IS_MANAGED_OTLP_GA = 'observability.managedOtlpGa';
export const IS_ADD_DATA_PAGE_V2_ENABLED = 'observability.addDataPageV2Enabled';
export const IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED =
  'observability.managedOtlpPrwEndpointEnabled';
export const IS_VENDOR_ENDPOINTS_ENABLED = 'observability.vendorEndpointsEnabled';
// Owned by the ingest_hub plugin, gates its guided AWS flow at /app/onboarding/aws.
// Keep in sync with x-pack/platform/plugins/shared/ingest_hub/common/constants.ts.
export const IS_INGEST_HUB_ONBOARDING_ENABLED = 'ingestHub.onboardingEnabled';
