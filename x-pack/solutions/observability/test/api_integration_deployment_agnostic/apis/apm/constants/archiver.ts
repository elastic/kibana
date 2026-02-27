/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

type ArchiveName =
  | '8.0.0'
  | 'apm_mappings_only_8.0.0'
  | 'infra_metrics_and_apm'
  | 'metrics_8.0.0'
  | 'observability_overview'
  | 'rum_8.0.0'
  | 'rum_test_data';

const ARCHIVES_DIR_REL_PATH =
  'x-pack/solutions/observability/test/apm_api_integration/common/fixtures/es_archiver';

export const ARCHIVER_ROUTES: { [key in ArchiveName]: string } = {
  '8.0.0': path.join(ARCHIVES_DIR_REL_PATH, '8.0.0'),
  'apm_mappings_only_8.0.0': path.join(ARCHIVES_DIR_REL_PATH, 'apm_mappings_only_8.0.0'),
  infra_metrics_and_apm: path.join(ARCHIVES_DIR_REL_PATH, 'infra_metrics_and_apm'),
  'metrics_8.0.0': path.join(ARCHIVES_DIR_REL_PATH, 'metrics_8.0.0'),
  observability_overview: path.join(ARCHIVES_DIR_REL_PATH, 'observability_overview'),
  'rum_8.0.0': path.join(ARCHIVES_DIR_REL_PATH, 'rum_8.0.0'),
  rum_test_data: path.join(ARCHIVES_DIR_REL_PATH, 'rum_test_data'),
};
