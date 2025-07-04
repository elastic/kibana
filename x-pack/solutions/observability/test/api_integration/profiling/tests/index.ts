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
const envGrepFiles = process.env.profiling_TEST_GREP_FILES as string;

function getGlobPattern() {
  try {
    const envGrepFilesParsed = JSON.parse(envGrepFiles as string) as string[];
    return envGrepFilesParsed.map((pattern) => `**/${pattern}**`);
  } catch (e) {
    // ignore
  }
  return '**/*.spec.ts';
}

export default function profilingApiIntegrationTests({
  getService,
  loadTestFile,
}: FtrProviderContext) {
  const registry = getService('registry');

  // FLAKY: https://github.com/elastic/kibana/issues/169820
  // FLAKY: https://github.com/elastic/kibana/issues/169841
  describe.skip('Profiling API tests', function () {
    const filePattern = getGlobPattern();
    const tests = globby.sync(filePattern, { cwd });

    if (envGrepFiles) {
      // eslint-disable-next-line no-console
      console.log(
        `\nCommand "--grep-files=${filePattern}" matched ${tests.length} file(s):\n${tests
          .map((name) => ` - ${name}`)
          .join('\n')}\n`
      );
    }

    tests.forEach((testName) => {
      describe(testName, () => {
        loadTestFile(require.resolve(`./${testName}`));
        registry.run();
      });
    });
  });
}
