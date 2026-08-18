/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreMapping } from './add_mitre_mappings';

// Fixture IDs come from the real MITRE dictionary the node validates against:
// TA0001 Initial Access, TA0002 Execution, T1078 Valid Accounts (belongs to
// initial-access but NOT execution), T1078.001 Default Accounts (sub of T1078).
describe('formatMitreMapping', () => {
  it('formats a tactic with a matching technique and subtechnique', () => {
    const result = formatMitreMapping({
      tactics: ['TA0001'],
      techniques: [{ id: 'T1078', subtechnique: ['T1078.001'] }],
    });

    expect(result).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0001',
          name: 'Initial Access',
          reference: 'https://attack.mitre.org/tactics/TA0001/',
        },
        technique: [
          {
            id: 'T1078',
            name: 'Valid Accounts',
            reference: 'https://attack.mitre.org/techniques/T1078/',
            subtechnique: [
              {
                id: 'T1078.001',
                name: 'Default Accounts',
                reference: 'https://attack.mitre.org/techniques/T1078/001/',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('outputs an empty technique array when no selected technique belongs to the tactic', () => {
    // T1078 is not an Execution technique, so the TA0002 mapping keeps the
    // tactic but drops the technique — `technique: []` must still be valid output.
    const result = formatMitreMapping({
      tactics: ['TA0002'],
      techniques: [{ id: 'T1078' }],
    });

    expect(result).toEqual([
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0002',
          name: 'Execution',
          reference: 'https://attack.mitre.org/tactics/TA0002/',
        },
        technique: [],
      },
    ]);
  });

  it('tolerates missing arrays in a malformed model response', () => {
    expect(formatMitreMapping({} as Parameters<typeof formatMitreMapping>[0])).toEqual([]);
  });
});
