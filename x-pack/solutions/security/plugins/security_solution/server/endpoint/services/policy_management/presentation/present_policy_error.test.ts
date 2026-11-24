/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EndpointAuthorizationError,
  EndpointHttpError,
  NotFoundError as EndpointNotFoundError,
} from '../../../errors';
import {
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  POLICY_CHANGE_SCHEMA_MESSAGE,
  PolicyChangePreparationError,
} from '../domain/impact';
import {
  InvalidEndpointPolicyError,
  POLICY_ERROR_MESSAGES,
  PolicyAmbiguousNameError,
  PolicyNotFoundError,
} from '../services/policy_errors';
import { classifyPolicyError } from './present_policy_error';

describe('classifyPolicyError', () => {
  it('classifies local not-found, ambiguous, and invalid errors', () => {
    expect(classifyPolicyError(new PolicyNotFoundError())).toBe('not_found');
    expect(classifyPolicyError(new PolicyAmbiguousNameError([{ id: 'a', name: 'alpha' }], 1))).toBe(
      'ambiguous_name'
    );
    expect(classifyPolicyError(new InvalidEndpointPolicyError())).toBe('invalid_policy');
  });

  it('classifies Endpoint authorization and not-found classes', () => {
    expect(classifyPolicyError(new EndpointAuthorizationError())).toBe('not_authorized');
    expect(classifyPolicyError(new EndpointNotFoundError('missing'))).toBe('not_found');
  });

  it('classifies HTTP 403 and 404 as not_authorized and not_found', () => {
    expect(classifyPolicyError(new EndpointHttpError('forbidden', 403))).toBe('not_authorized');
    expect(classifyPolicyError(new EndpointHttpError('missing', 404))).toBe('not_found');
  });

  it('classifies preparation codes and rejected operations, ignoring raw messages', () => {
    const leakyPath = 'linux.advanced.artifacts.global.channel';
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError(
          POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
          POLICY_CHANGE_SCHEMA_MESSAGE
        )
      )
    ).toBe('invalid_input');
    expect(
      classifyPolicyError(
        new PolicyChangePreparationError('unknown_code' as 'invalid_input', leakyPath)
      )
    ).toBe('unknown_error');
  });

  it('classifies bad requests and unknown faults as unknown_error, never as not_found', () => {
    expect(classifyPolicyError(new EndpointHttpError('bad request', 400))).toBe('unknown_error');
    expect(classifyPolicyError(new EndpointHttpError('server', 500))).toBe('unknown_error');
    expect(classifyPolicyError(new Error('ECONNREFUSED es.internal.local:9200'))).toBe(
      'unknown_error'
    );
    expect(classifyPolicyError('string error')).toBe('unknown_error');
    expect(classifyPolicyError(new Error(POLICY_ERROR_MESSAGES.baseline_unavailable))).toBe(
      'unknown_error'
    );
    expect(classifyPolicyError(new Error(POLICY_ERROR_MESSAGES.write_unverified))).toBe(
      'unknown_error'
    );
  });
});
