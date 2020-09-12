/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotState, toMatchSnapshot, toMatchInlineSnapshot } from 'jest-snapshot';
import path from 'path';
import expect from '@kbn/expect';
// @ts-expect-error
import prettier from 'prettier';
import { once } from 'lodash';
// @ts-expect-error
import babelTraverse from '@babel/traverse';

type ISnapshotState = InstanceType<typeof SnapshotState>;

let testContext: {
  file: string;
  testTitle: string;
  getSnapshotContext: () => SnapshotContext;
} | null = null;
interface SnapshotContext {
  snapshotState: ISnapshotState;
}

let registered: boolean = false;

export function registerMochaHooksForSnapshots() {
  const snapshotsToSave: ISnapshotState[] = [];

  registered = true;

  beforeEach(function () {
    const mochaContext = this;
    const file = mochaContext.currentTest?.file;
    const testTitle = mochaContext.currentTest?.fullTitle();

    if (!file || !testTitle) {
      throw new Error(`file or fullTitle not found in Mocha test context`);
    }

    testContext = {
      file,
      testTitle,
      getSnapshotContext: once(() => {
        const ctx = getSnapshotContextOrThrow({ file, testTitle });
        snapshotsToSave.push(ctx.snapshotState);
        return ctx;
      }),
    };
  });

  afterEach(() => {
    testContext = null;
  });

  after(() => {
    // save snapshot after tests complete, in reverse order (bottom to top)
    // to not change line/column number of successive inline snapshot tests
    snapshotsToSave
      .concat()
      .reverse()
      .forEach((snapshot) => {
        snapshot.save();
      });
    snapshotsToSave.length = 0;

    registered = false;
  });
}

const originalPrepareStackTrace = Error.prepareStackTrace;

// jest-snapshot uses a stack trace to determine which file/line/column
// an inline snapshot should be written to. We filter out match_snapshot
// from the stack trace to prevent it from wanting to write to this file.

Error.prepareStackTrace = (error, structuredStackTrace) => {
  const filteredStrackTrace = structuredStackTrace.filter((callSite) => {
    return !callSite.getFileName()?.endsWith('match_snapshot.ts');
  });
  if (originalPrepareStackTrace) {
    return originalPrepareStackTrace(error, filteredStrackTrace);
  }
};

function getSnapshotContextOrThrow({ file, testTitle }: { file: string; testTitle: string }) {
  const dirname = path.dirname(file);
  const filename = path.basename(file);

  const snapshotState = new SnapshotState(
    path.join(dirname + `/__snapshots__/` + filename.replace(path.extname(filename), '.snap')),
    {
      updateSnapshot: process.env.UPDATE_APM_SNAPSHOTS ? 'all' : 'new',
      getPrettier: () => prettier,
      getBabelTraverse: () => babelTraverse,
    }
  );

  return {
    snapshotState,
    currentTestName: testTitle,
  } as SnapshotContext;
}

export function expectSnapshot(received: any) {
  if (!registered) {
    throw new Error(
      'Mocha hooks were not registered before expectSnapshot was used. Call `registerMochaHooksForSnapshots` in your top-level describe().'
    );
  }

  if (!testContext) {
    throw new Error('A current Mocha context is needed to match snapshots');
  }

  const snapshotContext = testContext.getSnapshotContext();

  return {
    toMatch: expectToMatchSnapshot.bind(snapshotContext, received),
    toMatchInline: expectToMatchInlineSnapshot.bind(snapshotContext, received),
  };
}

function expectToMatchSnapshot(this: SnapshotContext, received: any) {
  const matcher = toMatchSnapshot.bind(this as any);
  const result = matcher(received);

  expect(result.pass).to.eql(true, result.message());
}

function expectToMatchInlineSnapshot(this: SnapshotContext, received: any, _actual?: any) {
  const matcher = toMatchInlineSnapshot.bind(this as any);

  const result = arguments.length === 1 ? matcher(received) : matcher(received, _actual);

  expect(result.pass).to.eql(true, result.message());
}
