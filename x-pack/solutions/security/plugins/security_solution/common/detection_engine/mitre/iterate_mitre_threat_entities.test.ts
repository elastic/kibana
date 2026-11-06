/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  iterateMitreThreatEntities,
  MITRE_ATTACK_FRAMEWORK,
  MITRE_ATLAS_FRAMEWORK,
} from './iterate_mitre_threat_entities';

const MITRE_FRAMEWORK = MITRE_ATTACK_FRAMEWORK;

const collect = (threats: Threats | undefined) => Array.from(iterateMitreThreatEntities(threats));

describe('iterateMitreThreatEntities', () => {
  it('yields nothing for undefined threats', () => {
    expect(collect(undefined)).toEqual([]);
  });

  it('yields nothing for empty threats array', () => {
    expect(collect([])).toEqual([]);
  });

  it('skips entries whose framework is not recognized', () => {
    const threats: Threats = [
      {
        framework: 'Some Other Framework',
        tactic: { id: 'X', name: 'X', reference: 'http://x' },
        technique: [],
      },
    ];
    expect(collect(threats)).toEqual([]);
  });

  it('yields tactic, technique, and subtechnique entities depth-first', () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'Defense Evasion', reference: 'http://ta' },
        technique: [
          {
            id: 'T1548',
            name: 'tech',
            reference: 'http://t',
            subtechnique: [
              { id: 'T1548.001', name: 'sub1', reference: 'http://s1' },
              { id: 'T1548.002', name: 'sub2', reference: 'http://s2' },
            ],
          },
          { id: 'T1134', name: 'tech2', reference: 'http://t2' },
        ],
      },
    ];

    expect(collect(threats)).toEqual([
      { type: 'tactic', id: 'TA0005', framework: 'enterprise' },
      { type: 'technique', id: 'T1548', framework: 'enterprise' },
      { type: 'subtechnique', id: 'T1548.001', framework: 'enterprise' },
      { type: 'subtechnique', id: 'T1548.002', framework: 'enterprise' },
      { type: 'technique', id: 'T1134', framework: 'enterprise' },
    ]);
  });

  it('does not dedupe across threat items', () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'a', reference: 'http://a' },
        technique: [],
      },
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'a', reference: 'http://a' },
        technique: [],
      },
    ];

    expect(collect(threats)).toEqual([
      { type: 'tactic', id: 'TA0005', framework: 'enterprise' },
      { type: 'tactic', id: 'TA0005', framework: 'enterprise' },
    ]);
  });

  it('handles threats with no techniques', () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'a', reference: 'http://a' },
        technique: [],
      },
    ];
    expect(collect(threats)).toEqual([{ type: 'tactic', id: 'TA0005', framework: 'enterprise' }]);
  });

  it('handles techniques with no subtechniques', () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'a', reference: 'http://a' },
        technique: [{ id: 'T1548', name: 't', reference: 'http://t' }],
      },
    ];
    expect(collect(threats)).toEqual([
      { type: 'tactic', id: 'TA0005', framework: 'enterprise' },
      { type: 'technique', id: 'T1548', framework: 'enterprise' },
    ]);
  });

  it('yields ATLAS entities with framework "atlas"', () => {
    const threats: Threats = [
      {
        framework: MITRE_ATLAS_FRAMEWORK,
        tactic: { id: 'AML.TA0000', name: 'ML Model Access', reference: 'http://ta' },
        technique: [
          {
            id: 'AML.T0044',
            name: 'Full ML Model Access',
            reference: 'http://t',
            subtechnique: [{ id: 'AML.T0024.002', name: 'sub', reference: 'http://s' }],
          },
        ],
      },
    ];

    expect(collect(threats)).toEqual([
      { type: 'tactic', id: 'AML.TA0000', framework: 'atlas' },
      { type: 'technique', id: 'AML.T0044', framework: 'atlas' },
      { type: 'subtechnique', id: 'AML.T0024.002', framework: 'atlas' },
    ]);
  });

  it('yields ATT&CK and ATLAS entities in order from a mixed array', () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA0005', name: 'Defense Evasion', reference: 'http://ta' },
        technique: [{ id: 'T1548', name: 'tech', reference: 'http://t' }],
      },
      {
        framework: MITRE_ATLAS_FRAMEWORK,
        tactic: { id: 'AML.TA0000', name: 'ML Model Access', reference: 'http://ata' },
        technique: [{ id: 'AML.T0044', name: 'atech', reference: 'http://at' }],
      },
    ];

    expect(collect(threats)).toEqual([
      { type: 'tactic', id: 'TA0005', framework: 'enterprise' },
      { type: 'technique', id: 'T1548', framework: 'enterprise' },
      { type: 'tactic', id: 'AML.TA0000', framework: 'atlas' },
      { type: 'technique', id: 'AML.T0044', framework: 'atlas' },
    ]);
  });

  it('skips unknown framework entries while yielding recognized ones', () => {
    const threats: Threats = [
      {
        framework: 'Some Other Framework',
        tactic: { id: 'X', name: 'X', reference: 'http://x' },
        technique: [],
      },
      {
        framework: MITRE_ATLAS_FRAMEWORK,
        tactic: { id: 'AML.TA0000', name: 'ML Model Access', reference: 'http://ata' },
        technique: [],
      },
    ];

    expect(collect(threats)).toEqual([{ type: 'tactic', id: 'AML.TA0000', framework: 'atlas' }]);
  });
});
