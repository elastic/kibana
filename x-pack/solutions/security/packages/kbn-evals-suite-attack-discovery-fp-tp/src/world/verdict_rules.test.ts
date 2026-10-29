/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW } from '@kbn/workflows/managed/definitions/alertzero';
import { deriveFpTpOutcome, FP_TP_VERDICT_RULES, type FpTpCheckResult } from './verdict_rules';

describe('managed FP/TP verdict rules', () => {
  it('matches the rules used to derive the expected outcome', () => {
    const workflow = parse(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW.yaml) as {
      steps: Array<{ name: string; with?: { message?: string } }>;
    };
    const message = workflow.steps.find(({ name }) => name === 'analyze')?.with?.message ?? '';
    const [, rules = ''] =
      /Choose the verdict by the first rule that matches:\n([\s\S]*?)\n\s*\n/.exec(message) ?? [];
    const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();

    expect(collapseWhitespace(rules)).toBe(collapseWhitespace(FP_TP_VERDICT_RULES));
  });
});

describe('deriveFpTpOutcome', () => {
  it.each<[FpTpCheckResult, FpTpCheckResult, FpTpCheckResult, string]>([
    ['supports', 'neutral', 'contradicts', 'inconclusive'],
    ['contradicts', 'contradicts', 'contradicts', 'false_positive'],
    ['neutral', 'neutral', 'contradicts', 'false_positive'],
    ['skipped', 'contradicts', 'contradicts', 'inconclusive'],
    ['contradicts', 'skipped', 'skipped', 'inconclusive'],
    ['supports', 'supports', 'supports', 'true_positive'],
    ['supports', 'neutral', 'supports', 'true_positive'],
    ['supports', 'supports', 'neutral', 'true_positive'],
    ['skipped', 'neutral', 'supports', 'true_positive'],
    ['supports', 'skipped', 'skipped', 'inconclusive'],
    ['neutral', 'neutral', 'neutral', 'inconclusive'],
  ])(
    'returns the outcome for entityRole %s, processParent %s, networkDestination %s: %s',
    (entityRole, processParent, networkDestination, outcome) => {
      expect(deriveFpTpOutcome({ entityRole, processParent, networkDestination })).toBe(outcome);
    }
  );
});
