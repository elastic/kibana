/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleMetadataInputSchema,
  getRuleMetadataStepDefinition,
} from './get_rule_metadata_step';

const createMockContext = (input: Record<string, unknown>, searchMock: jest.Mock) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
    getScopedEsClient: jest.fn().mockReturnValue({ search: searchMock }),
    renderInputTemplate: jest.fn(),
    getFakeRequest: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'security.getRuleMetadata',
});

describe('getRuleMetadata step', () => {
  describe('input schema', () => {
    it('accepts required ruleId', () => {
      const parsed = getRuleMetadataInputSchema.parse({ ruleId: 'rule-uuid-1' });
      expect(parsed.ruleId).toBe('rule-uuid-1');
    });

    it('rejects missing ruleId', () => {
      expect(getRuleMetadataInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('handler', () => {
    it('returns rule metadata from the most recent alert', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                'kibana.alert.rule.name': 'Suspicious Login',
                'kibana.alert.rule.uuid': 'rule-uuid-1',
                'kibana.alert.rule.description': 'Detects suspicious logins',
                'kibana.alert.rule.category': 'Credential Access',
                'kibana.alert.rule.type': 'query',
                'kibana.alert.severity': 'high',
                'kibana.alert.rule.references': [
                  'https://attack.mitre.org/techniques/T1110/',
                ],
                'kibana.alert.rule.threat': [
                  {
                    framework: 'MITRE ATT&CK',
                    tactic: { id: 'TA0006', name: 'Credential Access' },
                    technique: [{ id: 'T1110', name: 'Brute Force' }],
                  },
                ],
              },
            },
          ],
        },
      });

      const input = getRuleMetadataInputSchema.parse({ ruleId: 'rule-uuid-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleMetadataStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      const { metadata } = result.output!;
      expect(metadata.rule_name).toBe('Suspicious Login');
      expect(metadata.rule_uuid).toBe('rule-uuid-1');
      expect(metadata.rule_description).toBe('Detects suspicious logins');
      expect(metadata.severity).toBe('high');
      expect(metadata.threat_framework).toBe('MITRE ATT&CK');
      expect(metadata.threat_tactic).toEqual({ id: 'TA0006', name: 'Credential Access' });
      expect(metadata.threat_technique).toEqual({ id: 'T1110', name: 'Brute Force' });
      expect(metadata.references).toEqual([
        'https://attack.mitre.org/techniques/T1110/',
      ]);
      expect(result.output!.note).toContain('Exceptions are not included');
    });

    it('handles missing threat data gracefully', async () => {
      const searchMock = jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                'kibana.alert.rule.name': 'Custom Rule',
                'kibana.alert.severity': 'low',
              },
            },
          ],
        },
      });

      const input = getRuleMetadataInputSchema.parse({ ruleId: 'rule-2' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleMetadataStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      const { metadata } = result.output!;
      expect(metadata.rule_name).toBe('Custom Rule');
      expect(metadata.threat_framework).toBeUndefined();
      expect(metadata.threat_tactic).toBeUndefined();
      expect(metadata.threat_technique).toBeUndefined();
    });

    it('returns an error when no alerts are found for the rule', async () => {
      const searchMock = jest.fn().mockResolvedValue({ hits: { hits: [] } });

      const input = getRuleMetadataInputSchema.parse({ ruleId: 'non-existent' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleMetadataStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('No alerts found for rule ID non-existent');
    });

    it('uses the correct alerts index based on spaceId', async () => {
      const searchMock = jest.fn().mockResolvedValue({ hits: { hits: [] } });

      const input = getRuleMetadataInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      context.contextManager.getContext.mockReturnValue({
        workflow: { spaceId: 'my-space' },
      });
      await getRuleMetadataStepDefinition.handler(context as never);

      expect(searchMock.mock.calls[0][0].index).toContain('my-space');
    });

    it('returns an error when ES search throws', async () => {
      const searchMock = jest.fn().mockRejectedValue(new Error('connection refused'));
      const input = getRuleMetadataInputSchema.parse({ ruleId: 'rule-1' });
      const context = createMockContext(input, searchMock);
      const result = await getRuleMetadataStepDefinition.handler(context as never);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toBe('connection refused');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
