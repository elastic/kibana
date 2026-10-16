/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

globalSetupHook(
  'Ingest RUM test data',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.RUM_TEST_DATA);
  }
);
