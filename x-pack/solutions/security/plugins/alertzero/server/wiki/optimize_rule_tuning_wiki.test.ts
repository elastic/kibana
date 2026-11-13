/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { optimizeRuleTuningWiki } from './optimize_rule_tuning_wiki';

describe('optimizeRuleTuningWiki', () => {
  it('writes an established detection_rule page on approve', () => {
    const { edits } = optimizeRuleTuningWiki({
      ruleName: 'Suspicious PowerShell Download',
      ruleId: 'rule-1',
      diagnosis: {
        change_type: 'exception',
        reasoning: 'Fires on admin scripts.',
        fp_pattern: 'user.name is svc_backup',
      },
      gateOutcome: 'approved',
    });

    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({
      action: 'upsert',
      entity_type: 'detection_rule',
      slug: 'suspicious-powershell-download',
      status: 'established',
    });
    expect(edits[0].content).toContain('## Known benign');
    expect(edits[0].content).toContain('user.name is svc_backup');
  });

  it('archives on reject for exception/query changes', () => {
    const { edits } = optimizeRuleTuningWiki({
      ruleName: 'Rule',
      ruleId: 'id',
      diagnosis: { change_type: 'exception' },
      gateOutcome: 'rejected',
    });
    expect(edits).toEqual([
      expect.objectContaining({ action: 'archive', entity_type: 'detection_rule' }),
    ]);
  });

  it('returns no edits when the gate expired', () => {
    expect(
      optimizeRuleTuningWiki({
        ruleName: 'Rule',
        ruleId: 'id',
        diagnosis: { change_type: 'exception' },
        gateOutcome: 'expired',
      }).edits
    ).toEqual([]);
  });
});
