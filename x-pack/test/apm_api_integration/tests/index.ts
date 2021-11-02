/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import glob from 'glob';
import path from 'path';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { registry } from '../common/registry';

const cwd = path.join(__dirname);

export default function apmApiIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile } = providerContext;

  describe('APM API tests', function () {
    this.tags('ciGroup1');

    const tests = glob.sync('**/*.spec.ts', { cwd });

    tests.forEach((test) => {
      describe(test, function () {
        loadTestFile(require.resolve(`./${test}`));
      });
    });

    registry.run(providerContext);
  });
}
