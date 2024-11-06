/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessProjectType } from '@kbn/es';
import { InheritedServices } from '../../api_integration/services';

export interface CreateTestConfigOptions {
  serverlessProject: ServerlessProjectType;
  esServerArgs?: string[];
  kbnServerArgs?: string[];
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
  services?: InheritedServices;
  apps?: Record<string, { pathname: string; hash?: string }>;
}
