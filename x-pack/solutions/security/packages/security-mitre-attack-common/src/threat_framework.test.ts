/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THREAT_FRAMEWORK_NAME,
  buildMitreReferenceUrl,
  getMitreFrameworkById,
  getMitreFrameworkByThreatName,
} from './threat_framework';

describe('THREAT_FRAMEWORK_NAME', () => {
  it('matches the framework strings shipped on prebuilt rules', () => {
    expect(THREAT_FRAMEWORK_NAME).toEqual({ enterprise: 'MITRE ATT&CK', atlas: 'MITRE ATLAS' });
  });
});

describe('getMitreFrameworkByThreatName', () => {
  it('resolves the ATT&CK framework string', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATT&CK')).toBe('enterprise');
  });

  it('resolves the ATLAS framework string', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATLAS')).toBe('atlas');
  });

  it('returns undefined for unknown, differently cased, or missing strings', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATT&CK Mobile')).toBeUndefined();
    expect(getMitreFrameworkByThreatName('mitre att&ck')).toBeUndefined();
    expect(getMitreFrameworkByThreatName(undefined)).toBeUndefined();
  });
});

describe('getMitreFrameworkById', () => {
  it('treats AML-prefixed ids as ATLAS', () => {
    expect(getMitreFrameworkById('AML.TA0000')).toBe('atlas');
    expect(getMitreFrameworkById('AML.T0044')).toBe('atlas');
    expect(getMitreFrameworkById('AML.T0024.002')).toBe('atlas');
  });

  it('treats every other id as ATT&CK Enterprise', () => {
    expect(getMitreFrameworkById('TA0005')).toBe('enterprise');
    expect(getMitreFrameworkById('T1548.002')).toBe('enterprise');
    expect(getMitreFrameworkById('X1234')).toBe('enterprise');
  });
});

describe('buildMitreReferenceUrl', () => {
  describe('ATT&CK ids', () => {
    it('builds a tactic URL for TAxxxx ids', () => {
      expect(buildMitreReferenceUrl('TA0005')).toBe('https://attack.mitre.org/tactics/TA0005/');
    });

    it('builds a technique URL for Txxxx ids', () => {
      expect(buildMitreReferenceUrl('T1548')).toBe('https://attack.mitre.org/techniques/T1548/');
    });

    it('builds a subtechnique URL with the child as a path segment', () => {
      expect(buildMitreReferenceUrl('T1548.002')).toBe(
        'https://attack.mitre.org/techniques/T1548/002/'
      );
    });
  });

  describe('ATLAS ids', () => {
    it('builds a tactic URL for AML.TAxxxx ids', () => {
      expect(buildMitreReferenceUrl('AML.TA0000')).toBe(
        'https://atlas.mitre.org/tactics/AML.TA0000/'
      );
    });

    it('builds a technique URL for AML.Txxxx ids', () => {
      expect(buildMitreReferenceUrl('AML.T0044')).toBe(
        'https://atlas.mitre.org/techniques/AML.T0044/'
      );
    });

    it('keeps the dotted subtechnique id in the URL', () => {
      expect(buildMitreReferenceUrl('AML.T0024.002')).toBe(
        'https://atlas.mitre.org/techniques/AML.T0024.002/'
      );
    });

    it('returns undefined for an AML id that is neither a tactic nor a technique', () => {
      expect(buildMitreReferenceUrl('AML.CS0001')).toBeUndefined();
    });
  });

  it('honors an explicit framework over the id-based inference', () => {
    expect(buildMitreReferenceUrl('T1548', 'atlas')).toBeUndefined();
    expect(buildMitreReferenceUrl('AML.T0044', 'enterprise')).toBeUndefined();
  });

  it('returns undefined for an empty id', () => {
    expect(buildMitreReferenceUrl('')).toBeUndefined();
  });

  it('returns undefined for ids that do not match a known prefix', () => {
    expect(buildMitreReferenceUrl('X1234')).toBeUndefined();
    expect(buildMitreReferenceUrl('FAKE-001')).toBeUndefined();
  });
});
