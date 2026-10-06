/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveDecisionTreeSymptom } from './symptom';

describe('deriveDecisionTreeSymptom', () => {
  it('prefers a sub-technique id over the technique and the rule name', () => {
    expect(
      deriveDecisionTreeSymptom({
        subtechniqueId: 'T1059.001',
        techniqueId: 'T1059',
        ruleName: 'Suspicious PowerShell Script',
        spaceId: 'default',
      })
    ).toEqual({ symptom: 't1059-001', kiId: 'default:t1059-001' });
  });

  it('prefixes a one-word technique id so the slug stays valid', () => {
    expect(
      deriveDecisionTreeSymptom({
        techniqueId: 'T1059, T1055',
        ruleName: 'Suspicious PowerShell Script',
        spaceId: 'security',
      })
    ).toEqual({ symptom: 'technique-t1059', kiId: 'security:technique-t1059' });
  });

  it('keeps the first five words of a long rule name', () => {
    expect(
      deriveDecisionTreeSymptom({
        ruleName: 'Malicious Behavior Detection Alert Execution of a Windows Script',
        spaceId: 'default',
      })?.symptom
    ).toBe('malicious-behavior-detection-alert-execution');
  });

  it('skips when no candidate yields a slug', () => {
    expect(deriveDecisionTreeSymptom({ spaceId: 'default' })).toBeUndefined();
  });
});
