/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandArgDefinition, CommandDefinition } from '../types';
import {
  buildCommandUsageList,
  getConditionallyRequiredArgs,
  getExclusiveOrArgGroups,
  getOptionalArgs,
  getRequiredArgs,
} from './utils';

const mockArgDef = (overrides: Partial<CommandArgDefinition> = {}): CommandArgDefinition => ({
  required: false,
  allowMultiples: false,
  about: 'test arg',
  ...overrides,
});

const mockCommandDef = (name: string, args?: CommandDefinition['args']): CommandDefinition =>
  ({ name, args } as unknown as CommandDefinition);

describe('console service utils', () => {
  describe('getRequiredArgs()', () => {
    it('returns empty array when command has no args defined', () => {
      expect(getRequiredArgs(mockCommandDef('cmd'))).toEqual([]);
    });

    it('returns empty array when no args are required', () => {
      expect(
        getRequiredArgs(mockCommandDef('cmd', { opt1: mockArgDef(), opt2: mockArgDef() }))
      ).toEqual([]);
    });

    it('returns only required args', () => {
      const reqDef = mockArgDef({ required: true });
      const optDef = mockArgDef();

      expect(getRequiredArgs(mockCommandDef('cmd', { req1: reqDef, opt1: optDef }))).toEqual([
        { name: 'req1', definition: reqDef },
      ]);
    });

    it('returns all required args when multiple are required', () => {
      const arg1 = mockArgDef({ required: true });
      const arg2 = mockArgDef({ required: true });
      const opt1 = mockArgDef();

      expect(getRequiredArgs(mockCommandDef('cmd', { arg1, arg2, opt1 }))).toEqual([
        { name: 'arg1', definition: arg1 },
        { name: 'arg2', definition: arg2 },
      ]);
    });
  });

  describe('getOptionalArgs()', () => {
    it('returns empty array when command has no args defined', () => {
      expect(getOptionalArgs(mockCommandDef('cmd'))).toEqual([]);
    });

    it('returns non-required, non-exclusive, non-conditionally-required args', () => {
      const opt1 = mockArgDef();
      const opt2 = mockArgDef();

      expect(getOptionalArgs(mockCommandDef('cmd', { opt1, opt2 }))).toEqual([
        { name: 'opt1', definition: opt1 },
        { name: 'opt2', definition: opt2 },
      ]);
    });

    it('excludes required args', () => {
      const req1 = mockArgDef({ required: true });
      const opt1 = mockArgDef();

      expect(getOptionalArgs(mockCommandDef('cmd', { req1, opt1 }))).toEqual([
        { name: 'opt1', definition: opt1 },
      ]);
    });

    it('excludes args in an exclusive OR group that are not conditionally required', () => {
      const exclArg = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const opt1 = mockArgDef();

      expect(getOptionalArgs(mockCommandDef('cmd', { exclArg, opt1 }))).toEqual([
        { name: 'opt1', definition: opt1 },
      ]);
    });

    it('excludes conditionally required args by default', () => {
      const condArg = mockArgDef({ conditionallyRequired: ['someArg'] });
      const opt1 = mockArgDef();

      expect(getOptionalArgs(mockCommandDef('cmd', { condArg, opt1 }))).toEqual([
        { name: 'opt1', definition: opt1 },
      ]);
    });

    it('includes conditionally required args when includeConditionallyRequired is true', () => {
      const condArg = mockArgDef({ conditionallyRequired: ['someArg'] });
      const opt1 = mockArgDef();

      expect(
        getOptionalArgs(mockCommandDef('cmd', { condArg, opt1 }), {
          includeConditionallyRequired: true,
        })
      ).toEqual([
        { name: 'condArg', definition: condArg },
        { name: 'opt1', definition: opt1 },
      ]);
    });

    it('includes args that have both exclusiveOrGroupId and conditionallyRequired when includeConditionallyRequired is true', () => {
      const condExclArg = mockArgDef({
        exclusiveOrGroupId: 'grp1',
        conditionallyRequired: ['someArg'],
      });
      const opt1 = mockArgDef();

      expect(
        getOptionalArgs(mockCommandDef('cmd', { condExclArg, opt1 }), {
          includeConditionallyRequired: true,
        })
      ).toEqual([
        { name: 'condExclArg', definition: condExclArg },
        { name: 'opt1', definition: opt1 },
      ]);
    });
  });

  describe('getExclusiveOrArgGroups()', () => {
    it('returns empty object when command has no args defined', () => {
      expect(getExclusiveOrArgGroups(mockCommandDef('cmd'))).toEqual({});
    });

    it('returns empty object when no args have exclusiveOrGroupId', () => {
      expect(
        getExclusiveOrArgGroups(mockCommandDef('cmd', { opt1: mockArgDef(), opt2: mockArgDef() }))
      ).toEqual({});
    });

    it('groups args by their exclusiveOrGroupId', () => {
      const arg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const arg2 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const arg3 = mockArgDef({ exclusiveOrGroupId: 'grp2' });

      const result = getExclusiveOrArgGroups(mockCommandDef('cmd', { arg1, arg2, arg3 }));

      expect(result).toEqual({
        grp1: [
          { name: 'arg1', definition: arg1 },
          { name: 'arg2', definition: arg2 },
        ],
        grp2: [{ name: 'arg3', definition: arg3 }],
      });
    });

    it('excludes conditionally required args by default', () => {
      const arg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const condArg = mockArgDef({
        exclusiveOrGroupId: 'grp1',
        conditionallyRequired: ['arg1'],
      });

      const result = getExclusiveOrArgGroups(mockCommandDef('cmd', { arg1, condArg }));

      expect(result).toEqual({
        grp1: [{ name: 'arg1', definition: arg1 }],
      });
    });

    it('includes conditionally required args when includeConditionallyRequiredArgs is true', () => {
      const arg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const condArg = mockArgDef({
        exclusiveOrGroupId: 'grp1',
        conditionallyRequired: ['arg1'],
      });

      const result = getExclusiveOrArgGroups(mockCommandDef('cmd', { arg1, condArg }), {
        includeConditionallyRequiredArgs: true,
      });

      expect(result).toEqual({
        grp1: [
          { name: 'arg1', definition: arg1 },
          { name: 'condArg', definition: condArg },
        ],
      });
    });
  });

  describe('getConditionallyRequiredArgs()', () => {
    it('returns empty object when command has no args defined', () => {
      expect(getConditionallyRequiredArgs(mockCommandDef('cmd'))).toEqual({});
    });

    it('returns empty object when no args are conditionally required', () => {
      expect(
        getConditionallyRequiredArgs(
          mockCommandDef('cmd', { opt1: mockArgDef(), opt2: mockArgDef() })
        )
      ).toEqual({});
    });

    it('maps arg into allOf for the dependee arg when arg has no exclusiveOrGroupId', () => {
      const condArg = mockArgDef({ conditionallyRequired: ['argA'] });

      const result = getConditionallyRequiredArgs(mockCommandDef('cmd', { condArg }));

      expect(result).toEqual({
        argA: {
          allOf: [{ name: 'condArg', definition: condArg }],
          oneOf: {},
        },
      });
    });

    it('maps arg into oneOf for the dependee arg when arg has exclusiveOrGroupId', () => {
      const condArg = mockArgDef({
        conditionallyRequired: ['argA'],
        exclusiveOrGroupId: 'grp1',
      });

      const result = getConditionallyRequiredArgs(mockCommandDef('cmd', { condArg }));

      expect(result).toEqual({
        argA: {
          allOf: [],
          oneOf: {
            grp1: [{ name: 'condArg', definition: condArg }],
          },
        },
      });
    });

    it('handles multiple args conditionally required by the same dependee', () => {
      const condArg1 = mockArgDef({ conditionallyRequired: ['argA'] });
      const condArg2 = mockArgDef({ conditionallyRequired: ['argA'] });

      const result = getConditionallyRequiredArgs(mockCommandDef('cmd', { condArg1, condArg2 }));

      expect(result).toEqual({
        argA: {
          allOf: [
            { name: 'condArg1', definition: condArg1 },
            { name: 'condArg2', definition: condArg2 },
          ],
          oneOf: {},
        },
      });
    });

    it('handles an arg conditionally required by multiple dependees', () => {
      const condArg = mockArgDef({ conditionallyRequired: ['argA', 'argB'] });

      const result = getConditionallyRequiredArgs(mockCommandDef('cmd', { condArg }));

      expect(result).toEqual({
        argA: {
          allOf: [{ name: 'condArg', definition: condArg }],
          oneOf: {},
        },
        argB: {
          allOf: [{ name: 'condArg', definition: condArg }],
          oneOf: {},
        },
      });
    });

    it('groups exclusive OR args into oneOf by their group id for the same dependee', () => {
      const condArg1 = mockArgDef({
        conditionallyRequired: ['argA'],
        exclusiveOrGroupId: 'grp1',
      });
      const condArg2 = mockArgDef({
        conditionallyRequired: ['argA'],
        exclusiveOrGroupId: 'grp1',
      });

      const result = getConditionallyRequiredArgs(mockCommandDef('cmd', { condArg1, condArg2 }));

      expect(result).toEqual({
        argA: {
          allOf: [],
          oneOf: {
            grp1: [
              { name: 'condArg1', definition: condArg1 },
              { name: 'condArg2', definition: condArg2 },
            ],
          },
        },
      });
    });
  });

  describe('buildCommandUsageList()', () => {
    it('returns command name alone when no args are defined', () => {
      expect(buildCommandUsageList(mockCommandDef('cmd'))).toEqual(['cmd']);
    });

    it('returns command with required arg names', () => {
      const req1 = mockArgDef({ required: true });
      const req2 = mockArgDef({ required: true });

      expect(buildCommandUsageList(mockCommandDef('cmd', { req1, req2 }))).toEqual([
        'cmd --req1 --req2',
      ]);
    });

    it('returns command with optional args wrapped in brackets', () => {
      const opt1 = mockArgDef();

      expect(buildCommandUsageList(mockCommandDef('cmd', { opt1 }))).toEqual(['cmd [--opt1]']);
    });

    it('returns command with required args and optional args', () => {
      const req1 = mockArgDef({ required: true });
      const opt1 = mockArgDef();

      expect(buildCommandUsageList(mockCommandDef('cmd', { req1, opt1 }))).toEqual([
        'cmd --req1 [--opt1]',
      ]);
    });

    it('omits optional args when includeOptionalArgs is false', () => {
      const req1 = mockArgDef({ required: true });
      const opt1 = mockArgDef();

      expect(
        buildCommandUsageList(mockCommandDef('cmd', { req1, opt1 }), {
          includeOptionalArgs: false,
        })
      ).toEqual(['cmd --req1']);
    });

    it('returns one usage entry per exclusive OR group member', () => {
      const exclArg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const exclArg2 = mockArgDef({ exclusiveOrGroupId: 'grp1' });

      expect(buildCommandUsageList(mockCommandDef('cmd', { exclArg1, exclArg2 }))).toEqual([
        'cmd --exclArg1',
        'cmd --exclArg2',
      ]);
    });

    it('excludes used exclusive OR args from the optional args list in each usage entry', () => {
      const exclArg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const exclArg2 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const opt1 = mockArgDef();

      expect(buildCommandUsageList(mockCommandDef('cmd', { exclArg1, exclArg2, opt1 }))).toEqual([
        'cmd --exclArg1 [--opt1]',
        'cmd --exclArg2 [--opt1]',
      ]);
    });

    it('expands conditionally required exclusive OR args into additional usage entries', () => {
      // When exclArg1 is used, user must also pick one of: condArg1 or condArg2 (exclusive OR group)
      const exclArg1 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const exclArg2 = mockArgDef({ exclusiveOrGroupId: 'grp1' });
      const condArg1 = mockArgDef({
        conditionallyRequired: ['exclArg1'],
        exclusiveOrGroupId: 'condGrp',
      });
      const condArg2 = mockArgDef({
        conditionallyRequired: ['exclArg1'],
        exclusiveOrGroupId: 'condGrp',
      });

      const result = buildCommandUsageList(
        mockCommandDef('cmd', { exclArg1, exclArg2, condArg1, condArg2 })
      );

      expect(result).toContain('cmd --exclArg1 --condArg1');
      expect(result).toContain('cmd --exclArg1 --condArg2');
      expect(result).toContain('cmd --exclArg2');
    });

    it('returns command name alone when no args are defined and includeOptionalArgs is false', () => {
      expect(buildCommandUsageList(mockCommandDef('cmd'), { includeOptionalArgs: false })).toEqual([
        'cmd',
      ]);
    });
  });
});
