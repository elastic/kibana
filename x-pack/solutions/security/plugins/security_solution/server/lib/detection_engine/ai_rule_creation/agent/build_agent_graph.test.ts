/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreationState } from './state';
import { rejectionNode, resolveRejectionRoute } from './build_agent_graph';

const createState = (overrides: Partial<RuleCreationState> = {}): RuleCreationState => ({
  userQuery: 'detect suspicious PowerShell',
  rule: {},
  errors: [],
  warnings: [],
  rejectionReason: undefined,
  rejectionMessage: undefined,
  ...overrides,
});

describe('resolveRejectionRoute', () => {
  it('routes to rejection when rejectionReason is set', () => {
    expect(
      resolveRejectionRoute(
        createState({
          rejectionReason: { code: 'INVALID_OUTPUT', message: 'failed validation' },
        })
      )
    ).toBe('rejection');
  });

  it('routes to end when errors are present without a rejection reason', () => {
    expect(
      resolveRejectionRoute(
        createState({
          errors: ['Failed to generate ES|QL query'],
        })
      )
    ).toBe('end');
  });

  it('routes to continue when there are no errors or rejection reason', () => {
    expect(resolveRejectionRoute(createState())).toBe('continue');
  });
});

describe('rejectionNode', () => {
  it('formats INVALID_OUTPUT with schema validation details for terminal validation', async () => {
    const result = await rejectionNode(
      createState({
        rejectionReason: {
          code: 'INVALID_OUTPUT',
          message: 'The assembled rule failed schema validation',
          details: 'severity: Invalid enum value',
        },
      })
    );

    expect(result).toEqual({
      rejectionMessage:
        'I built a rule but it failed validation: severity: Invalid enum value. Please retry or rephrase.',
    });
  });

  it('formats INVALID_OUTPUT without details for name and description rejection', async () => {
    const result = await rejectionNode(
      createState({
        rejectionReason: {
          code: 'INVALID_OUTPUT',
          message: 'Generated rule name or description was empty or invalid after retry',
        },
      })
    );

    expect(result).toEqual({
      rejectionMessage: 'I built a rule but it failed validation. Please retry or rephrase.',
    });
  });

  it('formats NO_DATA with the user query', async () => {
    const result = await rejectionNode(
      createState({
        rejectionReason: {
          code: 'NO_DATA',
          message: 'No suitable index was found',
        },
      })
    );

    expect(result).toEqual({
      rejectionMessage:
        'No relevant data found in your indices for "detect suspicious PowerShell". Can you point me to a specific index or data source?',
    });
  });

  it('returns an empty update when rejectionReason is not set', async () => {
    expect(await rejectionNode(createState())).toEqual({});
  });
});
