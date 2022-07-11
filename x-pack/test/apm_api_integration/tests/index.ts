/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import glob from 'glob';
import path from 'path';
import { FtrProviderContext } from '../common/ftr_provider_context';

const cwd = path.join(__dirname);

export default function apmApiIntegrationTests({ getService, loadTestFile }: FtrProviderContext) {
  const registry = getService('registry');

  // FLAKY: https://github.com/elastic/kibana/issues/127939
  describe.skip('APM API tests', function () {
    const tests = glob.sync('**/*.spec.ts', { cwd });
    tests.forEach((test) => {
      describe(test, function () {
        loadTestFile(require.resolve(`./${test}`));
      });
    });

    registry.run();
  });
}
