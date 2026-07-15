/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { promises as fs } from 'fs';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseStringPromise } from 'xml2js';
import type { CommandArgs } from './lib';
import { command } from './lib';

describe('junit_transformer', () => {
  const junitFileName = 'junit.xml';
  let pathPattern: string;
  let path: string;
  let mockCommandArgs: CommandArgs;

  beforeEach(async () => {
    // get a temporary directory
    const directory = await mkdtemp(join(tmpdir(), 'junit-transformer-test-'));

    // define a glob pattern that will match the fixture
    pathPattern = `${directory}/*`;

    // determine the path for the fixture
    path = join(directory, junitFileName);

    // read the fixture and write it to the temporary file
    await fs.writeFile(
      path,
      await fs.readFile(join(__dirname, './fixtures/suite_with_failing_test.xml'), {
        encoding: 'utf8',
      })
    );

    mockCommandArgs = {
      // define the flags that will be passed to the command
      flags: {
        pathPattern,
        // use the directory as the root directory. This lets us test the relative file path functionality without having a tree of temp files.
        rootDirectory: directory,
        reportName: 'Test',
        writeInPlace: true,
      },

      log: {
        info: jest.fn(),
        write: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        warning: jest.fn(),
      },
    };
  });
  it('updates the file in place, applying the expected transformation', async () => {
    await command(mockCommandArgs);
    expect(await fs.readFile(path, { encoding: 'utf8' })).toMatchSnapshot();
  });

  it('does not duplicate the test name when the name already contains the classname', async () => {
    // Cypress/mocha reports the full BDD title in `name` for hooks, so appending
    // `classname` used to produce a duplicated title (see issue #206198).
    await fs.writeFile(
      path,
      await fs.readFile(join(__dirname, './fixtures/hook_failure.xml'), { encoding: 'utf8' })
    );

    await command(mockCommandArgs);

    const parsed = await parseStringPromise(await fs.readFile(path, { encoding: 'utf8' }));
    const testcase = parsed.testsuites.testsuite
      .flatMap(
        (suite: { testcase?: Array<{ $: { name: string }; failure?: unknown }> }) =>
          suite.testcase ?? []
      )
      .find((tc: { failure?: unknown }) => tc.failure);

    expect(testcase.$.name).toBe(
      'Endpoints page "before all" hook for "Shows endpoint on the list"'
    );
    expect(
      testcase.$.name.match(/"before all" hook for "Shows endpoint on the list"/g)
    ).toHaveLength(1);
  });
});
