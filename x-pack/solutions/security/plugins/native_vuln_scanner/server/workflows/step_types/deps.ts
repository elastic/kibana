/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';

export interface StepDeps {
  logger: Logger;
  /** Resolved lazily: the clients only exist after core start. */
  getScanDeps: () => Promise<{ es: ElasticsearchClient; packRepository: ISavedObjectsRepository }>;
  /** Resolved lazily: the licence only exists after the licensing plugin starts. */
  getLicense: () => Promise<ILicense>;
  /** From kibana.yml: include vendor-unfixed CVEs in feeds and findings. */
  includeUnfixed: boolean;
  now?: () => Date;
}
