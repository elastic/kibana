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
const envGrepFiles = process.env.APM_TEST_GREP_FILES as string;

function getGlobPattern() {
  try {
    const envGrepFilesParsed = JSON.parse(envGrepFiles as string) as string[];
    return envGrepFilesParsed.map((pattern) => {
      return pattern.includes('spec') ? `**/${pattern}**` : `**/${pattern}**.spec.ts`;
    });
  } catch (e) {
    // ignore
  }
  return '**/*.spec.ts';
}

export default function apmApiIntegrationTests({ getService, loadTestFile }: FtrProviderContext) {
  const registry = getService('registry');

  // DO NOT SKIP
  // Skipping here will skip the entire apm api test suite
  // Instead skip (flaky) tests individually
  // Failing: See https://github.com/elastic/kibana/issues/176948
  describe.skip('APM API tests', function () {
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
