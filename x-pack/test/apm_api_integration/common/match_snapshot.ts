/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotState, toMatchSnapshot, toMatchInlineSnapshot } from 'jest-snapshot';
import path from 'path';
import { Context } from 'mocha';
import expect from '@kbn/expect';
// @ts-expect-error
import prettier from 'prettier';
// @ts-expect-error
import babelTraverse from '@babel/traverse';

let testContext: { file: string; testTitle: string } | null = null;
interface SnapshotContext {
  snapshotState: InstanceType<typeof SnapshotState>;
}

export function init() {
  // @ts-expect-error
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

function getSnapshotContextOrThrow() {
  if (!testContext) {
    throw new Error('A current Mocha context is needed to match snapshots');
  }

  const { file, testTitle } = testContext;

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
  const snapshotContext = getSnapshotContextOrThrow();

  return {
    toMatch: expectToMatchSnapshot.bind(snapshotContext, received),
    toMatchInline: expectToMatchInlineSnapshot.bind(snapshotContext, received),
  };
}

function expectToMatchSnapshot(this: SnapshotContext, received: any) {
  const matcher = toMatchSnapshot.bind(this as any);
  const result = matcher(received);

  this.snapshotState.save();

  expect(result.pass).to.eql(true, result.message());
}

function expectToMatchInlineSnapshot(this: SnapshotContext, received: any, _actual?: any) {
  const matcher = toMatchInlineSnapshot.bind(this as any);

  const result = arguments.length === 1 ? matcher(received) : matcher(received, _actual);

  this.snapshotState.save();

  expect(result.pass).to.eql(true, result.message());
}
