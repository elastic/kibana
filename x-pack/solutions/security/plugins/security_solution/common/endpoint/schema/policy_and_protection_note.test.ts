/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPolicyResponseSchema } from '../../api/endpoint/policy/policy_response';
import {
  GetProtectionUpdatesNoteSchema,
  CreateUpdateProtectionUpdatesNoteSchema,
} from '../../api/endpoint/protection_updates_note/protection_updates_note';

describe('GetPolicyResponseSchema', () => {
  const { query } = GetPolicyResponseSchema;

  it('should accept a valid agentId', () => {
    expect(query.validate({ agentId: 'some-agent-id' })).toEqual({ agentId: 'some-agent-id' });
  });

  it('should reject agentId longer than 256 characters', () => {
    const longId = 'a'.repeat(257);
    expect(() => query.validate({ agentId: longId })).toThrowError();
  });

  it('should accept agentId exactly 256 characters long', () => {
    const maxId = 'a'.repeat(256);
    expect(query.validate({ agentId: maxId })).toEqual({ agentId: maxId });
  });
});

describe('GetProtectionUpdatesNoteSchema', () => {
  const { params } = GetProtectionUpdatesNoteSchema;

  it('should accept a valid package_policy_id', () => {
    expect(params.validate({ package_policy_id: 'some-policy-id' })).toEqual({
      package_policy_id: 'some-policy-id',
    });
  });

  it('should reject package_policy_id longer than 256 characters', () => {
    const longId = 'a'.repeat(257);
    expect(() => params.validate({ package_policy_id: longId })).toThrowError();
  });

  it('should accept package_policy_id exactly 256 characters long', () => {
    const maxId = 'a'.repeat(256);
    expect(params.validate({ package_policy_id: maxId })).toEqual({ package_policy_id: maxId });
  });
});

describe('CreateUpdateProtectionUpdatesNoteSchema', () => {
  const { body, params } = CreateUpdateProtectionUpdatesNoteSchema;

  it('should accept a valid note', () => {
    expect(body.validate({ note: 'A short note.' })).toEqual({ note: 'A short note.' });
  });

  it('should reject body missing note', () => {
    expect(() => body.validate({})).toThrowError();
  });

  it('should reject note longer than 10000 characters', () => {
    const longNote = 'a'.repeat(10001);
    expect(() => body.validate({ note: longNote })).toThrowError();
  });

  it('should accept note exactly 10000 characters long', () => {
    const maxNote = 'a'.repeat(10000);
    expect(body.validate({ note: maxNote })).toEqual({ note: maxNote });
  });

  it('should reject package_policy_id longer than 256 characters', () => {
    const longId = 'a'.repeat(257);
    expect(() => params.validate({ package_policy_id: longId })).toThrowError();
  });

  it('should accept package_policy_id exactly 256 characters long', () => {
    const maxId = 'a'.repeat(256);
    expect(params.validate({ package_policy_id: maxId })).toEqual({ package_policy_id: maxId });
  });
});
