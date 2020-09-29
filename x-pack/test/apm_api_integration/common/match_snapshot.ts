/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SnapshotState,
  toMatchSnapshot,
  toMatchInlineSnapshot,
  addSerializer,
} from 'jest-snapshot';
import path from 'path';
import expect from '@kbn/expect';
// @ts-expect-error
import prettier from 'prettier';
// @ts-expect-error
import babelTraverse from '@babel/traverse';
import { Suite, Test } from 'mocha';
import { flatten } from 'lodash';

type ISnapshotState = InstanceType<typeof SnapshotState>;

interface SnapshotContext {
  snapshotState: ISnapshotState;
  currentTestName: string;
}

let testContext: {
  file: string;
  snapshotTitle: string;
  snapshotContext: SnapshotContext;
} | null = null;

let registered: boolean = false;

function getSnapshotMeta(currentTest: Test) {
  // Make sure snapshot title is unique per-file, rather than entire
  // suite. This allows reuse of tests, for instance to compare
  // results for different configurations.

  const titles = [currentTest.title];
  const file = currentTest.file;

  let test: Suite | undefined = currentTest?.parent;

  while (test && test.file === file) {
    titles.push(test.title);
    test = test.parent;
  }

  const snapshotTitle = titles.reverse().join(' ');

  if (!file || !snapshotTitle) {
    throw new Error(`file or snapshotTitle not available in Mocha test context`);
  }

  return {
    file,
    snapshotTitle,
  };
}

export function registerMochaHooksForSnapshots() {
  let snapshotStatesByFilePath: Record<
    string,
    { snapshotState: ISnapshotState; testsInFile: Test[] }
  > = {};

  addSerializer({
    serialize: (num: number) => {
      return String(parseFloat(num.toPrecision(15)));
    },
    test: (value: any) => {
      return typeof value === 'number';
    },
  });

  registered = true;

  beforeEach(function () {
    const currentTest = this.currentTest!;

    const { file, snapshotTitle } = getSnapshotMeta(currentTest);

    if (!snapshotStatesByFilePath[file]) {
      snapshotStatesByFilePath[file] = getSnapshotState(file, currentTest);
    }

    testContext = {
      file,
      snapshotTitle,
      snapshotContext: {
        snapshotState: snapshotStatesByFilePath[file].snapshotState,
        currentTestName: snapshotTitle,
      },
    };
  });

  afterEach(function () {
    testContext = null;
  });

  after(function () {
    // save snapshot after tests complete

    const unused: string[] = [];

    const isUpdatingSnapshots = process.env.UPDATE_SNAPSHOTS;

    Object.keys(snapshotStatesByFilePath).forEach((file) => {
      const { snapshotState, testsInFile } = snapshotStatesByFilePath[file];

      testsInFile.forEach((test) => {
        const snapshotMeta = getSnapshotMeta(test);
        // If test is failed or skipped, mark snapshots as used. Otherwise,
        // running a test in isolation will generate false positives.
        if (!test.isPassed()) {
          snapshotState.markSnapshotsAsCheckedForTest(snapshotMeta.snapshotTitle);
        }
      });

      if (!isUpdatingSnapshots) {
        unused.push(...snapshotState.getUncheckedKeys());
      } else {
        snapshotState.removeUncheckedKeys();
      }

      snapshotState.save();
    });

    if (unused.length) {
      throw new Error(
        `${unused.length} obsolete snapshot(s) found:\n${unused.join(
          '\n\t'
        )}.\n\nRun tests again with \`UPDATE_SNAPSHOTS=1\` to remove them.`
      );
    }

    snapshotStatesByFilePath = {};

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

function recursivelyGetTestsFromSuite(suite: Suite): Test[] {
  return suite.tests.concat(flatten(suite.suites.map((s) => recursivelyGetTestsFromSuite(s))));
}

function getSnapshotState(file: string, test: Test) {
  const dirname = path.dirname(file);
  const filename = path.basename(file);

  let parent: Suite | undefined = test.parent;

  while (parent && parent.parent?.file === file) {
    parent = parent.parent;
  }

  if (!parent) {
    throw new Error('Top-level suite not found');
  }

  const snapshotState = new SnapshotState(
    path.join(dirname + `/__snapshots__/` + filename.replace(path.extname(filename), '.snap')),
    {
      updateSnapshot: process.env.UPDATE_SNAPSHOTS ? 'all' : 'new',
      getPrettier: () => prettier,
      getBabelTraverse: () => babelTraverse,
    }
  );

  return { snapshotState, testsInFile: recursivelyGetTestsFromSuite(parent) };
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

  return {
    toMatch: expectToMatchSnapshot.bind(null, testContext.snapshotContext, received),
    // use bind to support optional 3rd argument (actual)
    toMatchInline: expectToMatchInlineSnapshot.bind(null, testContext.snapshotContext, received),
  };
}

function expectToMatchSnapshot(snapshotContext: SnapshotContext, received: any) {
  const matcher = toMatchSnapshot.bind(snapshotContext as any);
  const result = matcher(received);

  expect(result.pass).to.eql(true, result.message());
}

function expectToMatchInlineSnapshot(
  snapshotContext: SnapshotContext,
  received: any,
  _actual?: any
) {
  const matcher = toMatchInlineSnapshot.bind(snapshotContext as any);

  const result = arguments.length === 2 ? matcher(received) : matcher(received, _actual);

  expect(result.pass).to.eql(true, result.message());
}
