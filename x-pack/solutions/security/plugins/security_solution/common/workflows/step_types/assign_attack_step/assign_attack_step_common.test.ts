/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignAttackInputSchema } from './assign_attack_step_common';
import { MAX_ATTACK_ID_LENGTH, MAX_USER_ID_LENGTH } from '../common/constants';

describe('assignAttackInputSchema', () => {
  it('should validate valid input for assigning users with array', () => {
    const input = { ids: 'attack-1', assignees_to_add: ['user1'], assignees_to_remove: [] };
    expect(assignAttackInputSchema.parse(input)).toEqual({
      ...input,
      update_related_alerts: false,
    });
  });

  it('should validate valid input for unassigning users with array', () => {
    const input = {
      ids: ['attack-1', 'attack-2'],
      assignees_to_add: [],
      assignees_to_remove: ['user2'],
    };
    expect(assignAttackInputSchema.parse(input)).toEqual({
      ...input,
      update_related_alerts: false,
    });
  });

  it('should validate valid input for both assignees_to_add and assignees_to_remove', () => {
    const input = {
      ids: 'attack-1',
      assignees_to_add: ['user1'],
      assignees_to_remove: ['user2'],
    };
    expect(assignAttackInputSchema.parse(input)).toEqual({
      ...input,
      update_related_alerts: false,
    });
  });

  it('should fail if neither assignees_to_add nor assignees_to_remove is provided', () => {
    const input = { ids: 'attack-1' };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_add is an empty array', () => {
    const input = { ids: 'attack-1', assignees_to_add: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_remove is an empty array', () => {
    const input = { ids: 'attack-1', assignees_to_remove: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should validate if assignees_to_add is missing', () => {
    const input = { ids: 'attack-1', assignees_to_remove: ['user1'] };
    expect(assignAttackInputSchema.parse(input)).toEqual({
      ...input,
      assignees_to_add: [],
      update_related_alerts: false,
    });
  });

  it('should validate if assignees_to_remove is missing', () => {
    const input = { ids: 'attack-1', assignees_to_add: ['user1'] };
    expect(assignAttackInputSchema.parse(input)).toEqual({
      ...input,
      assignees_to_remove: [],
      update_related_alerts: false,
    });
  });

  it('should fail if ids is missing', () => {
    const input = { assignees_to_add: ['user1'], assignees_to_remove: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if ids is an empty string', () => {
    const input = { ids: '', assignees_to_add: ['user1'], assignees_to_remove: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if ids is an empty array', () => {
    const input = { ids: [], assignees_to_add: ['user1'], assignees_to_remove: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if ids array contains an empty string', () => {
    const input = {
      ids: ['attack-1', ''],
      assignees_to_add: ['user1'],
      assignees_to_remove: [],
    };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if ids string is too long', () => {
    const input = {
      ids: 'a'.repeat(MAX_ATTACK_ID_LENGTH + 1),
      assignees_to_add: ['user1'],
      assignees_to_remove: [],
    };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if ids array contains a string that is too long', () => {
    const input = {
      ids: ['attack-1', 'a'.repeat(MAX_ATTACK_ID_LENGTH + 1)],
      assignees_to_add: ['user1'],
      assignees_to_remove: [],
    };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_add array contains an empty string', () => {
    const input = { ids: 'attack-1', assignees_to_add: [''], assignees_to_remove: [] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_remove array contains an empty string', () => {
    const input = { ids: 'attack-1', assignees_to_add: [], assignees_to_remove: [''] };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_add array contains a string that is too long', () => {
    const input = {
      ids: 'attack-1',
      assignees_to_add: ['a'.repeat(MAX_USER_ID_LENGTH + 1)],
      assignees_to_remove: [],
    };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should fail if assignees_to_remove array contains a string that is too long', () => {
    const input = {
      ids: 'attack-1',
      assignees_to_add: [],
      assignees_to_remove: ['a'.repeat(MAX_USER_ID_LENGTH + 1)],
    };
    expect(() => assignAttackInputSchema.parse(input)).toThrow();
  });

  it('should validate update_related_alerts', () => {
    const input = {
      ids: 'attack-1',
      assignees_to_add: ['user1'],
      assignees_to_remove: [],
      update_related_alerts: true,
    };
    expect(assignAttackInputSchema.parse(input)).toEqual(input);
  });
});
