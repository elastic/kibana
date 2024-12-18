/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../api/detection_engine/model/rule_schema/mocks';
import { getThreatMock } from '../../schemas/types/threat.mock';
import { extractThreatArray } from './extract_threat_array';

const mockThreat = getThreatMock()[0];

describe('extractThreatArray', () => {
  it('trims empty technique fields from threat object', () => {
    const mockRule = { ...getRulesSchemaMock(), threat: [{ ...mockThreat, technique: [] }] };
    const normalizedThreatArray = extractThreatArray(mockRule);

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
    const mockRule = {
      ...getRulesSchemaMock(),
      threat: [{ ...mockThreat, technique: [{ ...mockThreat.technique![0], subtechnique: [] }] }],
    };
    const normalizedThreatArray = extractThreatArray(mockRule);

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
