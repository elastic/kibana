/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedServices } from '../../api_integration/services';

export interface CreateTestConfigOptions {
  serverlessProject: 'es' | 'oblt' | 'security';
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
  services?: InheritedServices;
}
