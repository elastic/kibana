/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestTestDataHook } from '@kbn/scout';
import { type FullConfig } from '@playwright/test';
import { archives } from './constants';

async function globalSetup(config: FullConfig) {
  const data = [archives.ES.AUDITBEAT];

  return ingestTestDataHook(config, data);
}

// eslint-disable-next-line import/no-default-export
export default globalSetup;
