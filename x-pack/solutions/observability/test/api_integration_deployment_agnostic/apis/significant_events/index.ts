/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setUpDetectionEngineAccount } from './helpers/detection_engine_account';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const config = getService('config');

  describe('Significant Events Endpoints', () => {
    // Rules are created and enabled as the space's detection account, so every suite below needs
    // the space set up first. Once here, not per file: concurrent creates of the account conflict.
    before(async () => {
      await setUpDetectionEngineAccount({
        roleScopedSupertest,
        esClient,
        isServerless: Boolean(config.get('serverless')),
      });
    });

    loadTestFile(require.resolve('./significant_events'));
    loadTestFile(require.resolve('./knowledge_indicator_features'));
    loadTestFile(require.resolve('./knowledge_indicator_queries'));
    loadTestFile(require.resolve('./maintenance'));
    loadTestFile(require.resolve('./content'));
  });
}
