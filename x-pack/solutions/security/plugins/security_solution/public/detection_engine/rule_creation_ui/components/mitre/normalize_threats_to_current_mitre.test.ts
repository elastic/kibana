/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../../common/detection_engine/mitre/types';
import {
  normalizeThreatsToCurrentMitre,
  type MitreDataset,
} from './normalize_threats_to_current_mitre';

const tactic = (id: string, name: string): MitreTactic => ({
  id,
  name,
  reference: `https://attack.mitre.org/tactics/${id}/`,
  label: `${name} (${id})`,
  value: name.toLowerCase(),
});

const technique = (id: string, name: string, tactics: string[]): MitreTechnique => ({
  ...tactic(id, name),
  reference: `https://attack.mitre.org/techniques/${id}/`,
  tactics,
});

const subtechnique = (id: string, name: string, techniqueId: string): MitreSubTechnique => ({
  ...technique(id, name, []),
  reference: `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`,
  techniqueId,
});

const DATASET: MitreDataset = {
  // TA0005 renamed from "Defense Evasion" to "Stealth" in the current dataset.
  tactics: [tactic('TA0005', 'Stealth')],
  // T1234 renamed from "Old Technique" to "New Technique".
  techniques: [technique('T1234', 'New Technique', ['stealth'])],
  // T1234.001 renamed from "Old Sub" to "New Sub".
  subtechniques: [subtechnique('T1234.001', 'New Sub', 'T1234')],
};

describe('normalizeThreatsToCurrentMitre', () => {
  it('rewrites a drifted tactic name and reference while keeping the id', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0005', name: 'Defense Evasion', reference: 'https://old/' },
        technique: [],
      },
    ];

    const [result] = normalizeThreatsToCurrentMitre(threats, DATASET);

    expect(result.tactic).toEqual({
      id: 'TA0005',
      name: 'Stealth',
      reference: 'https://attack.mitre.org/tactics/TA0005/',
    });
  });

  it('rewrites drifted technique and subtechnique names', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0005', name: 'Defense Evasion', reference: 'https://old/' },
        technique: [
          {
            id: 'T1234',
            name: 'Old Technique',
            reference: 'https://old/',
            subtechnique: [{ id: 'T1234.001', name: 'Old Sub', reference: 'https://old/' }],
          },
        ],
      },
    ];

    const [result] = normalizeThreatsToCurrentMitre(threats, DATASET);

    expect(result.technique?.[0].name).toBe('New Technique');
    expect(result.technique?.[0].reference).toBe('https://attack.mitre.org/techniques/T1234/');
    expect(result.technique?.[0].subtechnique?.[0].name).toBe('New Sub');
    expect(result.technique?.[0].subtechnique?.[0].reference).toBe(
      'https://attack.mitre.org/techniques/T1234/001/'
    );
  });

  it('leaves ids that are no longer in the dataset untouched', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA9999', name: 'Removed Tactic', reference: 'https://removed/' },
        technique: [{ id: 'T9999', name: 'Removed Technique', reference: 'https://removed/' }],
      },
    ];

    const result = normalizeThreatsToCurrentMitre(threats, DATASET);

    // Nothing changed, so the same array reference is returned entry-for-entry.
    expect(result[0]).toBe(threats[0]);
    expect(result[0].tactic.name).toBe('Removed Tactic');
    expect(result[0].technique?.[0].name).toBe('Removed Technique');
  });

  it('leaves "none" placeholder entries untouched', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'none', name: 'none', reference: 'none' },
        technique: [],
      },
    ];

    const result = normalizeThreatsToCurrentMitre(threats, DATASET);

    expect(result[0]).toBe(threats[0]);
  });

  it('does not touch anything when the dataset has not loaded yet', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0005', name: 'Defense Evasion', reference: 'https://old/' },
        technique: [],
      },
    ];

    const result = normalizeThreatsToCurrentMitre(threats, {
      tactics: [],
      techniques: [],
      subtechniques: [],
    });

    expect(result).toBe(threats);
  });

  it('preserves an already up-to-date entry by reference', () => {
    const threats: Threats = [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0005',
          name: 'Stealth',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1234',
            name: 'New Technique',
            reference: 'https://attack.mitre.org/techniques/T1234/',
          },
        ],
      },
    ];

    const result = normalizeThreatsToCurrentMitre(threats, DATASET);

    expect(result[0]).toBe(threats[0]);
  });
});
