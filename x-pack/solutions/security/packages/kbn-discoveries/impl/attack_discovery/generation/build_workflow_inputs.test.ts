/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildWorkflowInputs } from './build_workflow_inputs';

describe('buildWorkflowInputs', () => {
  const defaultProps = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    parsedApiConfig: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
    },
  };

  describe('when called with only required fields', () => {
    const expectedApiConfig =
      '{"action_type_id":".gen-ai","connector_id":"test-connector-id","model":"gpt-4"}';

    let result: Record<string, string | undefined>;

    beforeEach(() => {
      result = buildWorkflowInputs(defaultProps);
    });

    it.each([
      ['alerts_index_pattern', '.alerts-security.alerts-default'],
      ['anonymization_fields', '[]'],
      ['api_config', expectedApiConfig],
      ['size', '100'],
    ])('returns %s', (key, expected) => {
      expect(result[key]).toBe(expected);
    });

    it.each([['end'], ['filter'], ['start']])('returns undefined %s', (key) => {
      expect(result[key]).toBeUndefined();
    });
  });

  describe('when size is provided', () => {
    it('returns size as a string', () => {
      const result = buildWorkflowInputs({
        ...defaultProps,
        size: 50,
      });

      expect(result.size).toBe('50');
    });
  });

  describe('when start is provided', () => {
    it('returns start', () => {
      const result = buildWorkflowInputs({
        ...defaultProps,
        start: '2024-01-01T00:00:00.000Z',
      });

      expect(result.start).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('when end is provided', () => {
    it('returns end', () => {
      const result = buildWorkflowInputs({
        ...defaultProps,
        end: '2024-01-31T23:59:59.999Z',
      });

      expect(result.end).toBe('2024-01-31T23:59:59.999Z');
    });
  });

  describe('when filter is provided', () => {
    it('returns filter as a JSON string', () => {
      const result = buildWorkflowInputs({
        ...defaultProps,
        filter: { query: { match: { field: 'value' } } },
      });

      expect(result.filter).toBe('{"query":{"match":{"field":"value"}}}');
    });
  });
});
