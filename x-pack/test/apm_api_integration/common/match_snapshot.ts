/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import path from 'path';
import { Context } from 'mocha';
import expect from '@kbn/expect';

let testContext: { file: string; testTitle: string } | null = null;

export function init() {
  // @ts-ignore
  const mochaContext = this as Context;
  const file = mochaContext.currentTest?.file;
  const testTitle = mochaContext.currentTest?.fullTitle();

  if (!file || !testTitle) {
    throw new Error(`file or fullTitle not found in Mocha test context`);
  }

  testContext = {
    file,
    testTitle,
  };
}

export function teardown() {
  testContext = null;
}

export function expectToMatchSnapshot(actual: any) {
  if (!testContext) {
    throw new Error('A current Mocha context is needed to match snapshots');
  }

  const { file, testTitle } = testContext;

  const dirname = path.dirname(file);
  const filename = path.basename(file);

  const snapshotState = new SnapshotState(
    path.join(dirname + `/__snapshots__/` + filename.replace(path.extname(filename), '.snap')),
    // not passing babel or prettier
    // @ts-ignore
    {
      updateSnapshot: process.env.UPDATE_APM_SNAPSHOTS ? 'all' : 'new',
    }
  );

  // not passing assertions
  // @ts-ignore
  const matcher = toMatchSnapshot.bind({ snapshotState, currentTestName: testTitle });
  const result = matcher(actual);

  snapshotState.save();

  return expect(result.pass).to.eql(true, result.message());
}
