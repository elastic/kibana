/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type ArchiveName =
  | '8.0.0'
  | 'apm_mappings_only_8.0.0'
  | 'infra_metrics_and_apm'
  | 'metrics_8.0.0'
  | 'observability_overview'
  | 'rum_8.0.0'
  | 'rum_test_data';

export const ARCHIVER_ROUTES: { [key in ArchiveName]: string } = {
  '8.0.0': 'x-pack/test/apm_api_integration/common/fixtures/es_archiver/8.0.0',
  'apm_mappings_only_8.0.0':
    'x-pack/test/apm_api_integration/common/fixtures/es_archiver/apm_mappings_only_8.0.0',
  infra_metrics_and_apm:
    'x-pack/test/apm_api_integration/common/fixtures/es_archiver/infra_metrics_and_apm',
  'metrics_8.0.0': 'x-pack/test/apm_api_integration/common/fixtures/es_archiver/metrics_8.0.0',
  observability_overview:
    'x-pack/test/apm_api_integration/common/fixtures/es_archiver/observability_overview',
  'rum_8.0.0': 'x-pack/test/apm_api_integration/common/fixtures/es_archiver/rum_8.0.0',
  rum_test_data: 'x-pack/test/apm_api_integration/common/fixtures/es_archiver/rum_test_data',
};
