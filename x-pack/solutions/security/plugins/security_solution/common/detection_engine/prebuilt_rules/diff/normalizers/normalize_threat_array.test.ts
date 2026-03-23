/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getThreatMock } from '../../../schemas/types/threat.mock';
import { normalizeThreatArray } from './normalize_threat_array';

const mockThreat = getThreatMock()[0];

describe('normalizeThreatArray', () => {
  it('returns an empty array if threat field is undefined', () => {
    const normalizedThreatArray = normalizeThreatArray(undefined);

    expect(normalizedThreatArray).toEqual([]);
  });

  it('normalizes url ending backslashes', () => {
    const mockThreatArray = [
      {
        ...mockThreat,
        tactic: {
          ...mockThreat.tactic,
          reference: 'https://attack.mitre.org/tactics/TA0000',
        },
        technique: [
          {
            ...mockThreat.technique![0],
            reference: 'https://attack.mitre.org/techniques/T0000/',
            subtechnique: [
              {
                ...mockThreat.technique![0].subtechnique![0],
                reference: 'https://attack.mitre.org/techniques/T0000/000',
              },
            ],
          },
        ],
      },
    ];

    const normalizedThreatArray = normalizeThreatArray(mockThreatArray);

    expect(normalizedThreatArray).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0000',
          name: 'test tactic',
          reference: 'https://attack.mitre.org/tactics/TA0000/',
        },
        technique: [
          {
            id: 'T0000',
            name: 'test technique',
            reference: 'https://attack.mitre.org/techniques/T0000/',
            subtechnique: [
              {
                id: 'T0000.000',
                name: 'test subtechnique',
                reference: 'https://attack.mitre.org/techniques/T0000/000/',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('normalizes url ending backslashes with query strings', () => {
    const mockThreatArray = [
      {
        ...mockThreat,
        tactic: {
          ...mockThreat.tactic,
          reference: 'https://attack.mitre.org/tactics/TA0000?query=test',
        },
        technique: [],
      },
    ];

    const normalizedThreatArray = normalizeThreatArray(mockThreatArray);

    expect(normalizedThreatArray).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0000',
          name: 'test tactic',
          reference: 'https://attack.mitre.org/tactics/TA0000/?query=test',
        },
      },
    ]);
  });

  it('trims empty technique fields from threat object', () => {
    const mockThreatArray = [{ ...mockThreat, technique: [] }];
    const normalizedThreatArray = normalizeThreatArray(mockThreatArray);

    expect(normalizedThreatArray).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0000',
          name: 'test tactic',
          reference: 'https://attack.mitre.org/tactics/TA0000/',
        },
      },
    ]);
  });

  it('trims empty subtechnique fields from threat object', () => {
    const mockThreatArray = [
      { ...mockThreat, technique: [{ ...mockThreat.technique![0], subtechnique: [] }] },
    ];
    const normalizedThreatArray = normalizeThreatArray(mockThreatArray);

    expect(normalizedThreatArray).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0000',
          name: 'test tactic',
          reference: 'https://attack.mitre.org/tactics/TA0000/',
        },
        technique: [
          {
            id: 'T0000',
            name: 'test technique',
            reference: 'https://attack.mitre.org/techniques/T0000/',
          },
        ],
      },
    ]);
  });
});
