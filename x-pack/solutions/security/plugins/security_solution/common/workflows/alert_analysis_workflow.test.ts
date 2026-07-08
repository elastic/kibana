/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertAnalysisWorkflowSettings, isThresholdRangeValid } from './alert_analysis_workflow';

const baseSettings = {
  autoCloseEnabled: true,
  autoCloseConfidenceScoreMinThreshold: 0.85,
  autoCloseConfidenceScoreMaxThreshold: 1,
  agentId: 'elastic-ai-agent',
  tagPrefix: 'alert-analysis',
};

describe('AlertAnalysisWorkflowSettings tagPrefix validation', () => {
  it.each(['alert-analysis', 'security.alert.analysis', 'alert_analysis', 'aa123'])(
    'accepts the valid tag prefix %p',
    (tagPrefix) => {
      expect(AlertAnalysisWorkflowSettings.safeParse({ ...baseSettings, tagPrefix }).success).toBe(
        true
      );
    }
  );

  // The prefix is interpolated into Liquid expression strings, so quotes, braces, pipes, spaces,
  // and empty values must be rejected before they can break the workflow at run time. Prefixes made
  // up of only punctuation (e.g. '.', '_', '-') are also rejected: they pass the charset check but
  // carry no meaningful namespace, so at least one letter or number is required.
  it.each([
    '',
    '   ',
    'foo"bar',
    'foo{{bar}}',
    'a|b',
    'has space',
    'tag:value',
    '.',
    '_',
    '-',
    '._-',
  ])('rejects the unsafe tag prefix %p', (tagPrefix) => {
    expect(AlertAnalysisWorkflowSettings.safeParse({ ...baseSettings, tagPrefix }).success).toBe(
      false
    );
  });
});

describe('isThresholdRangeValid', () => {
  it('is valid when min is lower than max', () => {
    expect(
      isThresholdRangeValid({
        autoCloseConfidenceScoreMinThreshold: 0.5,
        autoCloseConfidenceScoreMaxThreshold: 0.9,
      })
    ).toBe(true);
  });

  it('is invalid when min is greater than or equal to max', () => {
    expect(
      isThresholdRangeValid({
        autoCloseConfidenceScoreMinThreshold: 0.9,
        autoCloseConfidenceScoreMaxThreshold: 0.9,
      })
    ).toBe(false);
  });
});
