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
});
