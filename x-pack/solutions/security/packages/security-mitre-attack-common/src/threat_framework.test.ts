/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THREAT_FRAMEWORK_DISPLAY_NAME,
  THREAT_FRAMEWORK_NAME,
  buildMitreReferenceUrl,
  getMitreFrameworkByThreatName,
  isAtlasEntityId,
} from './threat_framework';

describe('THREAT_FRAMEWORK_NAME', () => {
  it('matches the framework strings shipped on prebuilt rules', () => {
    expect(THREAT_FRAMEWORK_NAME).toEqual({
      enterprise: 'MITRE ATT&CK',
      atlas: 'MITRE ATLAS',
      ics: 'MITRE ATT&CK ICS',
    });
  });
});

describe('THREAT_FRAMEWORK_DISPLAY_NAME', () => {
  it('adds the MITRE trademark symbols to each framework name', () => {
    expect(THREAT_FRAMEWORK_DISPLAY_NAME).toEqual({
      enterprise: 'MITRE ATT&CK®',
      atlas: 'MITRE ATLAS™',
      ics: 'MITRE ATT&CK® for ICS',
    });
  });
});

describe('getMitreFrameworkByThreatName', () => {
  it('resolves the ATT&CK framework string', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATT&CK')).toBe('enterprise');
  });

  it('resolves the ATLAS framework string', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATLAS')).toBe('atlas');
  });

  it('resolves the ATT&CK for ICS framework string', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATT&CK ICS')).toBe('ics');
  });

  it('returns undefined for unknown, differently cased, or missing strings', () => {
    expect(getMitreFrameworkByThreatName('MITRE ATT&CK Mobile')).toBeUndefined();
    expect(getMitreFrameworkByThreatName('mitre att&ck')).toBeUndefined();
    expect(getMitreFrameworkByThreatName(undefined)).toBeUndefined();
  });
});

describe('isAtlasEntityId', () => {
  it('is true for AML-prefixed ids', () => {
    expect(isAtlasEntityId('AML.TA0000')).toBe(true);
    expect(isAtlasEntityId('AML.T0044')).toBe(true);
    expect(isAtlasEntityId('AML.T0024.002')).toBe(true);
  });

  it('is false for every other id, including ids shared by Enterprise and ICS', () => {
    expect(isAtlasEntityId('TA0005')).toBe(false);
    expect(isAtlasEntityId('T1548.002')).toBe(false);
    expect(isAtlasEntityId('T0800')).toBe(false);
    expect(isAtlasEntityId('T1701')).toBe(false);
  });
});

describe('buildMitreReferenceUrl', () => {
  describe('ATT&CK ids', () => {
    it('builds a tactic URL for TAxxxx ids', () => {
      expect(buildMitreReferenceUrl('TA0005', 'enterprise')).toBe(
        'https://attack.mitre.org/tactics/TA0005/'
      );
    });

    it('builds a technique URL for Txxxx ids', () => {
      expect(buildMitreReferenceUrl('T1548', 'enterprise')).toBe(
        'https://attack.mitre.org/techniques/T1548/'
      );
    });

    it('builds a subtechnique URL with the child as a path segment', () => {
      expect(buildMitreReferenceUrl('T1548.002', 'enterprise')).toBe(
        'https://attack.mitre.org/techniques/T1548/002/'
      );
    });
  });

  describe('ATLAS ids', () => {
    it('builds a tactic URL for AML.TAxxxx ids', () => {
      expect(buildMitreReferenceUrl('AML.TA0000', 'atlas')).toBe(
        'https://atlas.mitre.org/tactics/AML.TA0000/'
      );
    });

    it('builds a technique URL for AML.Txxxx ids', () => {
      expect(buildMitreReferenceUrl('AML.T0044', 'atlas')).toBe(
        'https://atlas.mitre.org/techniques/AML.T0044/'
      );
    });

    it('keeps the dotted subtechnique id in the URL', () => {
      expect(buildMitreReferenceUrl('AML.T0024.002', 'atlas')).toBe(
        'https://atlas.mitre.org/techniques/AML.T0024.002/'
      );
    });

    it('returns undefined for an AML id that is neither a tactic nor a technique', () => {
      expect(buildMitreReferenceUrl('AML.CS0001', 'atlas')).toBeUndefined();
    });
  });

  describe('ICS ids', () => {
    it('builds a tactic URL', () => {
      expect(buildMitreReferenceUrl('TA0100', 'ics')).toBe(
        'https://attack.mitre.org/tactics/TA0100/'
      );
    });

    it('builds technique URLs for T0xxx and T1xxx ids', () => {
      expect(buildMitreReferenceUrl('T0800', 'ics')).toBe(
        'https://attack.mitre.org/techniques/T0800/'
      );
      expect(buildMitreReferenceUrl('T1701', 'ics')).toBe(
        'https://attack.mitre.org/techniques/T1701/'
      );
    });

    it('builds a subtechnique URL with the child as a path segment', () => {
      expect(buildMitreReferenceUrl('T0843.001', 'ics')).toBe(
        'https://attack.mitre.org/techniques/T0843/001/'
      );
      expect(buildMitreReferenceUrl('T1691.001', 'ics')).toBe(
        'https://attack.mitre.org/techniques/T1691/001/'
      );
    });

    it('returns undefined for ATLAS ids', () => {
      expect(buildMitreReferenceUrl('AML.T0044', 'ics')).toBeUndefined();
    });
  });

  it("honors the given framework's id format", () => {
    expect(buildMitreReferenceUrl('T1548', 'atlas')).toBeUndefined();
    expect(buildMitreReferenceUrl('AML.T0044', 'enterprise')).toBeUndefined();
  });

  it('returns undefined for an empty id', () => {
    expect(buildMitreReferenceUrl('', 'enterprise')).toBeUndefined();
  });

  it('returns undefined for ids that do not match a known prefix', () => {
    expect(buildMitreReferenceUrl('X1234', 'enterprise')).toBeUndefined();
    expect(buildMitreReferenceUrl('FAKE-001', 'enterprise')).toBeUndefined();
  });
});
