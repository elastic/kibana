/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import globby from 'globby';
import path from 'path';
import { FtrProviderContext } from '../common/ftr_provider_context';

const cwd = path.join(__dirname);

const envGrepFiles = process.env.APM_TEST_GREP_FILES;
function getGlobPattern() {
  if (!envGrepFiles) {
    return '**/*.spec.ts';
  }

  return envGrepFiles.includes('**') ? envGrepFiles : `**/*${envGrepFiles}*`;
}

export default function apmApiIntegrationTests({ getService, loadTestFile }: FtrProviderContext) {
  const registry = getService('registry');

  describe('APM API tests', function () {
    const tests = globby.sync(getGlobPattern(), { cwd });

    if (envGrepFiles) {
      // eslint-disable-next-line no-console
      console.log(
        `\nCommand "--grep-files=${envGrepFiles}" matched ${tests.length} file(s):\n${tests
          .map((name) => ` - ${name}`)
          .join('\n')}\n`
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
