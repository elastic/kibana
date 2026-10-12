/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mitreEntitySchema,
  mitreEntitiesSchema,
  type MitreTactic,
  type MitreTechnique,
  type MitreSubtechnique,
  type MitreEntity,
} from './schema';

const baseTacticFixture = {
  framework: 'enterprise' as const,
  framework_version: '14.1',
  id: 'TA0001',
  name: 'Initial Access',
  reference: 'https://attack.mitre.org/tactics/TA0001',
  description: 'The adversary is trying to get into your network.',
  revoked: false,
  deprecated: false,
  type: 'tactic' as const,
  position: 0,
};

const baseTechniqueFixture = {
  framework: 'enterprise' as const,
  framework_version: '14.1',
  id: 'T1059',
  name: 'Command and Scripting Interpreter',
  reference: 'https://attack.mitre.org/techniques/T1059',
  description: 'Adversaries may abuse command and script interpreters.',
  revoked: false,
  deprecated: false,
  type: 'technique' as const,
  tactic_ids: ['TA0002'],
};

const baseSubtechniqueFixture = {
  framework: 'enterprise' as const,
  framework_version: '14.1',
  id: 'T1059.001',
  name: 'PowerShell',
  reference: 'https://attack.mitre.org/techniques/T1059/001',
  description: 'Adversaries may abuse PowerShell commands.',
  revoked: false,
  deprecated: false,
  type: 'subtechnique' as const,
  tactic_ids: ['TA0002'],
  technique_id: 'T1059',
};

describe('mitreEntitySchema', () => {
  describe('valid fixtures', () => {
    it('parses a valid tactic and result is assignable to MitreTactic', () => {
      const result = mitreEntitySchema.parse(baseTacticFixture);
      const typed: MitreTactic = result as MitreTactic;
      expect(typed.type).toBe('tactic');
      expect(typed.position).toBe(0);
    });

    it('parses a valid technique and result is assignable to MitreTechnique', () => {
      const result = mitreEntitySchema.parse(baseTechniqueFixture);
      const typed: MitreTechnique = result as MitreTechnique;
      expect(typed.type).toBe('technique');
      expect(typed.tactic_ids).toEqual(['TA0002']);
    });

    it('parses a valid subtechnique and result is assignable to MitreSubtechnique', () => {
      const result = mitreEntitySchema.parse(baseSubtechniqueFixture);
      const typed: MitreSubtechnique = result as MitreSubtechnique;
      expect(typed.type).toBe('subtechnique');
      expect(typed.technique_id).toBe('T1059');
    });

    it('accepts optional superseded_by_id on a tactic', () => {
      const result = mitreEntitySchema.parse({
        ...baseTacticFixture,
        superseded_by_id: ['TA0099'],
      });
      expect((result as MitreTactic).superseded_by_id).toEqual(['TA0099']);
    });
  });

  describe('rejection cases', () => {
    it('rejects when description is missing', () => {
      const { description: _description, ...withoutDescription } = baseTacticFixture;
      expect(() => mitreEntitySchema.parse(withoutDescription)).toThrow();
    });

    it('rejects a wrong type discriminator', () => {
      expect(() =>
        mitreEntitySchema.parse({ ...baseTacticFixture, type: 'unknown_type' })
      ).toThrow();
    });

    it('rejects subtechnique missing technique_id', () => {
      const { technique_id: _tid, ...withoutTechniqueId } = baseSubtechniqueFixture;
      expect(() => mitreEntitySchema.parse(withoutTechniqueId)).toThrow();
    });

    it('rejects an unknown framework value', () => {
      expect(() => mitreEntitySchema.parse({ ...baseTacticFixture, framework: 'ics' })).toThrow();
    });
  });
});

describe('mitreEntitiesSchema', () => {
  it('parses a valid array of entities and result is assignable to MitreEntity[]', () => {
    const result = mitreEntitiesSchema.parse([
      baseTacticFixture,
      baseTechniqueFixture,
      baseSubtechniqueFixture,
    ]);
    const typed: MitreEntity[] = result;
    expect(typed).toHaveLength(3);
  });

  it('parses an array containing entities from a second framework version, proving mixed sets are valid', () => {
    const v2Tactic = {
      ...baseTacticFixture,
      framework_version: '20.0',
      id: 'TA0002',
      name: 'Execution',
      reference: 'https://attack.mitre.org/tactics/TA0002/',
    };
    const result = mitreEntitiesSchema.parse([baseTacticFixture, v2Tactic]);
    expect(result).toHaveLength(2);
    expect(result[0].framework_version).toBe('14.1');
    expect(result[1].framework_version).toBe('20.0');
  });

  it('rejects an array containing an invalid member', () => {
    const invalidMember = { ...baseTacticFixture, type: 'unknown_type' };
    expect(() => mitreEntitiesSchema.parse([baseTacticFixture, invalidMember])).toThrow();
  });
});
