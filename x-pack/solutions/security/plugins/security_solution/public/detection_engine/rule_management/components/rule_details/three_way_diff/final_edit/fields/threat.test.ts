/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatSerializer } from './threat';

describe('threatSerializer', () => {
  it('preserves a non-ATT&CK framework on threat entries', () => {
    const result = threatSerializer({
      threat: [
        {
          framework: 'MITRE ATLAS',
          tactic: {
            id: 'AML.TA0000',
            name: 'ML Model Access',
            reference: 'https://atlas.mitre.org/tactics/AML.TA0000/',
          },
          technique: [],
        },
      ],
    });

    expect(result.threat).toEqual([
      {
        framework: 'MITRE ATLAS',
        tactic: {
          id: 'AML.TA0000',
          name: 'ML Model Access',
          reference: 'https://atlas.mitre.org/tactics/AML.TA0000/',
        },
        technique: [],
      },
    ]);
  });

  it('defaults threat entries with an empty framework to MITRE ATT&CK', () => {
    const result = threatSerializer({
      threat: [
        {
          framework: '',
          tactic: {
            id: 'TA0005',
            name: 'Defense Evasion',
            reference: 'https://attack.mitre.org/tactics/TA0005/',
          },
          technique: [],
        },
      ],
    });

    expect(result.threat[0].framework).toBe('MITRE ATT&CK');
  });

  it('defaults threat entries without a framework to MITRE ATT&CK', () => {
    const result = threatSerializer({
      threat: [
        {
          tactic: {
            id: 'TA0005',
            name: 'Defense Evasion',
            reference: 'https://attack.mitre.org/tactics/TA0005/',
          },
          technique: [],
        },
      ],
    });

    expect(result.threat).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [],
      },
    ]);
  });
});
