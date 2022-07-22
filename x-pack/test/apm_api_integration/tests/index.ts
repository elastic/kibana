/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import glob from 'glob';
import path from 'path';
import { argv } from 'yargs';
import { FtrProviderContext } from '../common/ftr_provider_context';

const cwd = path.join(__dirname);

const argvGrepFiles = argv.grepFiles as string | undefined;
function getGlobPattern() {
  if (!argvGrepFiles) {
    return '**/*.spec.ts';
  }

  return argvGrepFiles.includes('.spec.ts') ? argvGrepFiles : `**/*${argvGrepFiles}*.spec.ts`;
}

export default function apmApiIntegrationTests({ getService, loadTestFile }: FtrProviderContext) {
  const registry = getService('registry');

  describe('APM API tests', function () {
    const tests = glob.sync(getGlobPattern(), { cwd });

    if (argvGrepFiles) {
      // eslint-disable-next-line no-console
      console.log(
        `\nCommand "--grep-files=${argvGrepFiles}" matching ${tests.length} file(s):\n - ${tests}\n`
      );
    }

    tests.forEach((test) => {
      describe(test, function () {
        loadTestFile(require.resolve(`./${test}`));
      });
    });

    registry.run();
  });
}
