/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { buildRunDeepLink, RESERVED_STEP_EXECUTION_IDS } from '.';

describe('buildRunDeepLink', () => {
  it('builds the workflows execution-details path', () => {
    expect(
      buildRunDeepLink({ executionId: 'run-1', workflowId: 'system-security-watch-deep' })
    ).toEqual('/system-security-watch-deep?tab=executions&executionId=run-1');
  });

  it('URL-encodes the workflow id', () => {
    expect(buildRunDeepLink({ executionId: 'run-1', workflowId: 'a b/c' })).toEqual(
      '/a%20b%2Fc?tab=executions&executionId=run-1'
    );
  });

  it('URL-encodes the execution id', () => {
    expect(buildRunDeepLink({ executionId: 'r?&=', workflowId: 'w' })).toEqual(
      '/w?tab=executions&executionId=r%3F%26%3D'
    );
  });

  it('appends the step execution id so the link lands on the exact step (F1)', () => {
    expect(
      buildRunDeepLink({
        executionId: 'run-1',
        stepExecutionId: 'step-exec-1',
        workflowId: 'system-security-watch-deep',
      })
    ).toEqual(
      '/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-1'
    );
  });

  it('URL-encodes the step execution id', () => {
    expect(
      buildRunDeepLink({ executionId: 'run-1', stepExecutionId: 'a b&c', workflowId: 'w' })
    ).toEqual('/w?tab=executions&executionId=run-1&stepExecutionId=a%20b%26c');
  });

  it('omits the step execution id when it is not known', () => {
    expect(
      buildRunDeepLink({ executionId: 'run-1', stepExecutionId: undefined, workflowId: 'w' })
    ).toEqual('/w?tab=executions&executionId=run-1');
  });

  it('omits an empty step execution id', () => {
    expect(
      buildRunDeepLink({ executionId: 'run-1', stepExecutionId: '', workflowId: 'w' })
    ).toEqual('/w?tab=executions&executionId=run-1');
  });

  it.each(RESERVED_STEP_EXECUTION_IDS)('never emits the reserved pseudo-step %p', (reserved) => {
    expect(
      buildRunDeepLink({ executionId: 'run-1', stepExecutionId: reserved, workflowId: 'w' })
    ).toEqual('/w?tab=executions&executionId=run-1');
  });
});

/**
 * PND's step-level deep links (plan F1) are built entirely from Workflows-app behavior that PND
 * does not own and cannot import: the query params `use_workflow_url_state.ts` parses, and the two
 * pseudo-step ids `workflow_execution_detail.tsx` reserves. Both are **module-private consts in a
 * browser bundle** — `PSEUDO_STEP_OVERVIEW` / `PSEUDO_STEP_TRIGGER` are declared without `export`
 * — so no import can pin them, and exporting them would be a Workflows source change this epic
 * forbids. A rename on that side would break every PND deep link **silently**: the link still
 * builds, the Workflows app just ignores the param and lands on the execution overview, which is
 * indistinguishable from a row that never had a step.
 *
 * So this is a source scan, the same tripwire technique `pnd_security_regression.test.ts` uses for
 * the internal-user guard (D6). It fails loudly on the two drifts that matter, and its failure
 * message names the file to look at.
 */
describe('the Workflows-app contract PND deep links depend on (drift guard)', () => {
  /** Walk up from this test file to the directory that holds Kibana's `src/platform`. */
  const repoRoot = (): string => {
    const marker = join('src', 'platform');
    let dir = __dirname;

    while (!existsSync(join(dir, marker))) {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error(`could not locate the Kibana repo root walking up from ${__dirname}`);
      }
      dir = parent;
    }

    return dir;
  };

  const WORKFLOWS_PUBLIC = join(
    'src',
    'platform',
    'plugins',
    'shared',
    'workflows_management',
    'public'
  );

  /** Declares the reserved pseudo-step ids and matches the selection against `stepExecutions[].id`. */
  const EXECUTION_DETAIL = join(
    WORKFLOWS_PUBLIC,
    'features',
    'workflow_execution_detail',
    'ui',
    'workflow_execution_detail.tsx'
  );

  /** Parses the query params PND's deep link carries. */
  const URL_STATE = join(WORKFLOWS_PUBLIC, 'hooks', 'use_workflow_url_state.ts');

  const readWorkflowsSource = (repoRelativePath: string): string => {
    const absolute = join(repoRoot(), repoRelativePath);

    if (!existsSync(absolute)) {
      throw new Error(
        `${repoRelativePath} no longer exists. PND's step-level deep links are built from what that file reads and reserves, so find where it moved and update this guard rather than deleting it.`
      );
    }

    return readFileSync(absolute, 'utf8');
  };

  /** The query params a step-level PND deep link actually emits, read off the built link. */
  const emittedQueryParams = (): string[] => {
    const link = buildRunDeepLink({
      executionId: 'run-1',
      stepExecutionId: 'step-exec-1',
      workflowId: 'system-security-watch-deep',
    });

    return Array.from(new URLSearchParams(link.slice(link.indexOf('?'))).keys());
  };

  it('reserves exactly the pseudo-step ids the Workflows execution view reserves', () => {
    const declared = Array.from(
      readWorkflowsSource(EXECUTION_DETAIL).matchAll(/const PSEUDO_STEP_\w+ = '([^']+)'/g),
      ([, id]) => id
    );

    expect(declared.sort()).toEqual([...RESERVED_STEP_EXECUTION_IDS].sort());
  });

  it('emits only query params the Workflows app parses', () => {
    const source = readWorkflowsSource(URL_STATE);

    expect(emittedQueryParams().filter((param) => source.includes(`params.${param}`))).toEqual(
      emittedQueryParams()
    );
  });

  it('emits a `tab` value the Workflows app names', () => {
    const link = buildRunDeepLink({ executionId: 'run-1', workflowId: 'w' });
    const tab = new URLSearchParams(link.slice(link.indexOf('?'))).get('tab');

    expect(readWorkflowsSource(URL_STATE).includes(`'${tab}'`)).toBe(true);
  });
});
