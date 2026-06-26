/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeThreatsForForm } from './normalize_threats_for_form';

describe('normalizeThreatsForForm', () => {
  it('returns undefined when threat is undefined', () => {
    expect(normalizeThreatsForForm(undefined)).toBeUndefined();
  });

  it('returns empty array when threat is empty', () => {
    expect(normalizeThreatsForForm([])).toEqual([]);
  });

  it('coerces a single technique object into an array', () => {
    expect(
      normalizeThreatsForForm([
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0002',
            name: 'Execution',
            reference: 'https://attack.mitre.org/tactics/TA0002/',
          },
          technique: {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
          },
        },
      ] as never)
    ).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [
          {
            id: 'T1059',
            name: 'Command and Scripting Interpreter',
            reference: 'https://attack.mitre.org/techniques/T1059/',
            subtechnique: [],
          },
        ],
      },
    ]);
  });

  it('filters out entries without a tactic', () => {
    expect(
      normalizeThreatsForForm([
        {
          framework: 'MITRE ATT&CK',
          technique: [{ id: 'T1059', name: 'Command and Scripting Interpreter', reference: 'x' }],
        },
      ] as never)
    ).toEqual([]);
  });
});
