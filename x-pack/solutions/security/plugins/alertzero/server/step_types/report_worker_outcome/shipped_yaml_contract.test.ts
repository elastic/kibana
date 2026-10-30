/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getWorkflowsWithReportSteps,
  loadWorkerWorkflowContracts,
  reportStepsIn,
} from './shipped_yaml_contract.test_helpers';

/**
 * The contract between the shipped Worker YAML and the report step's input schema. Each Worker
 * declares the workflows it reports from, with runs that exercise each report, in its own
 * `shipped_yaml_contract.<worker>.fixture.ts` module (`SHIPPED_YAML_CONTRACTS`), and its
 * `shipped_yaml_contract.<worker>.test.ts` validates them. This test finds those modules by file
 * name, so Workers can start reporting in any order without editing a shared list.
 *
 * The declared workflows are also the ones a Worker claims for the close guard,
 * `worker_close_reports.test.ts` in `@kbn/workflows/managed`: it checks the closes of every
 * workflow with a report step, and this test keeps those exactly the declared ones.
 *
 * Both guards are opt-in: they check only workflows that already have a report step. Until a
 * Worker's change adds its first report step and its fixture, there is neither, so both pass
 * without checking anything.
 */

const contractsLoaded = loadWorkerWorkflowContracts(__dirname);

describe('shipped Worker reports and the reportWorkerOutcome schema', () => {
  it('covers every AlertZero workflow with a report step, and only those', async () => {
    const covered = (await contractsLoaded).flatMap(({ contracts }) =>
      contracts.map(({ workflowId }) => workflowId)
    );

    expect([...new Set(covered)].sort()).toEqual(getWorkflowsWithReportSteps().sort());
  });

  it('declares each workflow for one Worker only', async () => {
    const declared = (await contractsLoaded).flatMap(({ contracts }) =>
      contracts.map(({ workflowId }) => workflowId)
    );

    expect(declared.filter((id, index) => declared.indexOf(id) !== index)).toEqual([]);
  });

  it('finds a report step in a static parallel branch', () => {
    const yaml = `
steps:
  - name: fan_out
    type: parallel
    branches:
      - name: settle
        steps:
          - name: report_run_completed
            type: alertzero.reportWorkerOutcome
            with:
              event: worker_run_completed
`;

    expect(reportStepsIn(yaml).map(({ name }) => name)).toEqual(['report_run_completed']);
  });
});
