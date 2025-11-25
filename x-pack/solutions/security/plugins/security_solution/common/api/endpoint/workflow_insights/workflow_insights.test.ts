/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  GetWorkflowInsightsRequestSchema,
  UpdateWorkflowInsightRequestSchema,
} from './workflow_insights';

describe('Workflow Insights', () => {
  describe('GetWorkflowInsightsRequestSchema', () => {
    const validateQuery = (query: Record<string, unknown>) => {
      return schema.object(GetWorkflowInsightsRequestSchema).validate(query);
    };

    it('should validate successfully with valid parameters', () => {
      const validQuery = {
        query: {
          size: 10,
          from: 0,
          ids: ['valid-id-1', 'valid-id-2'],
          categories: ['endpoint'],
          types: ['incompatible_antivirus'],
          sourceTypes: ['llm-connector'],
          sourceIds: ['source-1', 'source-2'],
          targetTypes: ['endpoint'],
          targetIds: ['target-1', 'target-2'],
          actionTypes: ['refreshed', 'remediated'],
        },
      };

      expect(() => validateQuery(validQuery)).not.toThrow();
    });

    describe('policy_response_failure type validation', () => {
      it('should validate successfully with policy_response_failure type', () => {
        const validQuery = {
          query: {
            types: ['policy_response_failure'],
          },
        };

        expect(() => validateQuery(validQuery)).not.toThrow();
      });

      it('should validate successfully with mixed types including policy_response_failure', () => {
        const validQuery = {
          query: {
            types: ['incompatible_antivirus', 'policy_response_failure'],
          },
        };

        expect(() => validateQuery(validQuery)).not.toThrow();
      });

      it('should validate successfully with noisy_process_tree and policy_response_failure', () => {
        const validQuery = {
          query: {
            types: ['noisy_process_tree', 'policy_response_failure'],
          },
        };

        expect(() => validateQuery(validQuery)).not.toThrow();
      });
    });

    it('should throw an error for invalid types', () => {
      const invalidQuery = {
        query: {
          size: 'not-a-number', // Invalid size
          actionTypes: ['invalid-action'], // Invalid action type
        },
      };

      expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
        '"[query.size]: expected value of type [number] but got [string]"'
      );
    });

    it('should throw an error if ids contain empty strings', () => {
      const invalidQuery = {
        query: {
          ids: ['valid-id', ''],
          actionTypes: ['refreshed'],
        },
      };

      expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
        '"[query.ids.1]: value has length [0] but it must have a minimum length of [1]."'
      );
    });

    it('should throw an error if sourceIds contain empty strings', () => {
      const invalidQuery = {
        query: {
          sourceIds: ['valid-source', ' '],
          actionTypes: ['refreshed'],
        },
      };

      expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
        '"[query.sourceIds.1]: sourceId cannot be an empty string"'
      );
    });

    it('should validate successfully when optional fields are omitted', () => {
      const validQuery = {
        query: {},
      };

      expect(() => validateQuery(validQuery)).not.toThrow();
    });

    it('should throw an error for unsupported categories or types', () => {
      const invalidQuery = {
        query: {
          categories: ['unsupported-category'],
          types: ['unsupported-type'],
          actionTypes: ['refreshed'],
        },
      };

      expect(() => validateQuery(invalidQuery)).toThrowErrorMatchingInlineSnapshot(
        '"[query.categories.0]: expected value to equal [endpoint]"'
      );
    });
  });

  describe('UpdateWorkflowInsightRequestSchema', () => {
    const validateRequest = (request: Record<string, unknown>) => {
      return schema.object(UpdateWorkflowInsightRequestSchema).validate(request);
    };

    it('should validate successfully with valid parameters', () => {
      const validRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          '@timestamp': '2024-11-29T00:00:00Z',
          message: 'Valid message',
          category: 'endpoint',
          type: 'incompatible_antivirus',
          source: {
            type: 'llm-connector',
            id: 'source-id',
            data_range_start: '2024-11-01T00:00:00Z',
            data_range_end: '2024-11-30T00:00:00Z',
          },
          target: {
            type: 'endpoint',
            ids: ['target-id-1', 'target-id-2'],
          },
          action: {
            type: 'refreshed',
            timestamp: '2024-11-29T00:00:00Z',
          },
          value: 'Valid value',
          remediation: {
            exception_list_items: [
              {
                list_id: 'list-id',
                name: 'Exception 1',
                description: 'Description',
                entries: [{ key: 'value' }],
                tags: ['tag1'],
                os_types: ['windows'],
              },
            ],
          },
          metadata: {
            notes: { note1: 'Value 1' },
            message_variables: ['var1', 'var2'],
          },
        },
      };

      expect(() => validateRequest(validRequest)).not.toThrow();
    });

    it('should throw an error if insightId is missing', () => {
      const invalidRequest = {
        params: {},
        body: {},
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(
        '"[params.insightId]: expected value of type [string] but got [undefined]"'
      );
    });

    it('should throw an error if insightId is an empty string', () => {
      const invalidRequest = {
        params: {
          insightId: '',
        },
        body: {},
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(
        '"[params.insightId]: value has length [0] but it must have a minimum length of [1]."'
      );
    });

    it('should throw an error if category is invalid', () => {
      const invalidRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          category: 'invalid-category', // Invalid category
          type: 'incompatible_antivirus',
          action: { type: 'refreshed' },
        },
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(
        '"[body.category]: expected value to equal [endpoint]"'
      );
    });

    it('should throw an error if type is invalid', () => {
      const invalidRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          type: 'invalid-type', // Invalid type
          action: { type: 'refreshed' },
        },
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(`
    "[body.type]: types that failed validation:
    - [body.type.0]: expected value to equal [incompatible_antivirus]
    - [body.type.1]: expected value to equal [policy_response_failure]
    - [body.type.2]: expected value to equal [noisy_process_tree]"
    `);
    });

    describe('policy_response_failure type validation in PUT requests', () => {
      it('should validate successfully with policy_response_failure type', () => {
        const validRequest = {
          params: {
            insightId: 'valid-insight-id',
          },
          body: {
            type: 'policy_response_failure',
            action: { type: 'refreshed' },
          },
        };

        expect(() => validateRequest(validRequest)).not.toThrow();
      });

      it('should validate successfully with policy_response_failure in body fields', () => {
        const validRequest = {
          params: {
            insightId: 'valid-insight-id',
          },
          body: {
            '@timestamp': '2024-11-29T00:00:00Z',
            message: 'Policy response failure detected',
            category: 'endpoint',
            type: 'policy_response_failure',
            source: {
              type: 'llm-connector',
              id: 'source-id',
              data_range_start: '2024-11-01T00:00:00Z',
              data_range_end: '2024-11-30T00:00:00Z',
            },
            target: {
              type: 'endpoint',
              ids: ['agent-1', 'agent-2'],
            },
            action: {
              type: 'remediated',
              timestamp: '2024-11-29T00:00:00Z',
            },
            value: 'Policy configuration issue',
          },
        };

        expect(() => validateRequest(validRequest)).not.toThrow();
      });

      it('should validate successfully with policy_response_failure remediation data', () => {
        const validRequest = {
          params: {
            insightId: 'valid-insight-id',
          },
          body: {
            type: 'policy_response_failure',
            action: {
              type: 'remediated',
              timestamp: '2024-11-29T00:00:00Z',
            },
            remediation: {
              exception_list_items: [
                {
                  list_id: 'policy-exceptions',
                  name: 'Policy Response Exception',
                  description: 'Exception for policy response failures',
                  entries: [{ field: 'policy.response', value: 'failed' }],
                  tags: ['policy', 'response', 'failure'],
                  os_types: ['windows', 'linux'],
                },
              ],
            },
          },
        };

        expect(() => validateRequest(validRequest)).not.toThrow();
      });

      it('should validate successfully with policy_response_failure metadata', () => {
        const validRequest = {
          params: {
            insightId: 'valid-insight-id',
          },
          body: {
            type: 'policy_response_failure',
            action: { type: 'refreshed' },
            metadata: {
              notes: {
                policy_id: 'policy-123',
                failure_reason: 'Configuration timeout',
              },
              message_variables: ['policy_id', 'failure_reason', 'agent_version'],
            },
          },
        };

        expect(() => validateRequest(validRequest)).not.toThrow();
      });
    });

    it('should throw an error if target ids contain empty strings', () => {
      const invalidRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          target: {
            type: 'endpoint',
            ids: ['valid-id', ''], // Invalid empty string in ids
          },
          action: { type: 'refreshed' },
        },
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(
        '"[body.target.ids.1]: value has length [0] but it must have a minimum length of [1]."'
      );
    });

    it('should validate successfully when optional fields are omitted', () => {
      const validRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          action: { type: 'refreshed' },
        },
      };

      expect(() => validateRequest(validRequest)).not.toThrow();
    });

    it('should throw an error for unsupported action types', () => {
      const invalidRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          action: {
            type: 'unsupported-action', // Invalid action type
          },
        },
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(`
    "[body.action.type]: types that failed validation:
    - [body.action.type.0]: expected value to equal [refreshed]
    - [body.action.type.1]: expected value to equal [remediated]
    - [body.action.type.2]: expected value to equal [suppressed]
    - [body.action.type.3]: expected value to equal [dismissed]"
    `);
    });

    it('should throw an error if remediation list items contain invalid data', () => {
      const invalidRequest = {
        params: {
          insightId: 'valid-insight-id',
        },
        body: {
          remediation: {
            exception_list_items: [
              {
                list_id: 'list-id',
                name: 'Exception 1',
                description: 'Description',
                entries: 'invalid-entries', // Invalid entries
                tags: ['tag1'],
                os_types: ['windows'],
              },
            ],
          },
          action: { type: 'refreshed' },
        },
      };

      expect(() => validateRequest(invalidRequest)).toThrowErrorMatchingInlineSnapshot(
        '"[body.remediation.exception_list_items.0.entries]: could not parse array value from json input"'
      );
    });
  });
});
