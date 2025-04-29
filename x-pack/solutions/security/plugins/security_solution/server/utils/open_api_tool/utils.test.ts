/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationOrWebhook } from './utils';
import { formatToolName, isOperation } from './utils';

describe('utils', () => {
  describe('isOperation', () => {
    it('returns true for operation', () => {
      expect(
        isOperation({
          isWebhook: () => false,
        } as unknown as OperationOrWebhook)
      ).toBe(true);
    });

    it('returns false webhook', () => {
      expect(
        isOperation({
          isWebhook: () => true,
        } as unknown as OperationOrWebhook)
      ).toBe(false);
    });
  });

  describe('formatToolName', () => {
    it.each([
      ['tool name', 'tool_name'],
      ['tool/name', 'tool_name'],
      ['tool?name', 'tool_name'],
      ['tool  name', 'tool__name'],
      ['tool name ', 'tool_name_'],
    ])("formats tool name '%s' to '%s'", (input: string, expected: string) => {
      expect(formatToolName(input)).toEqual(expected);
    });
  });
});
