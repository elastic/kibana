/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsAppState } from '../root_reducer';

export const testNowRunsSelector = ({ manualTestRuns }: SyntheticsAppState) => manualTestRuns;

export const manualTestRunSelector =
  (configId?: string) =>
  ({ manualTestRuns }: SyntheticsAppState) =>
    configId ? manualTestRuns[configId] : undefined;

export const manualTestRunInProgressSelector =
  (configId?: string) =>
  ({ manualTestRuns }: SyntheticsAppState) => {
    if (!configId) return false;
    return (
      manualTestRuns[configId]?.status === 'in-progress' ||
      manualTestRuns[configId]?.status === 'loading'
    );
  };
