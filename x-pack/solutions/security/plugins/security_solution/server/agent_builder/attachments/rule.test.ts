/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createRuleAttachmentType } from './rule';
import { readRules } from '../../lib/detection_engine/rule_management/logic/detection_rules_client/read_rules';
import { transform } from '../../lib/detection_engine/rule_management/utils/utils';

jest.mock('../../lib/detection_engine/rule_management/logic/detection_rules_client/read_rules');
jest.mock('../../lib/detection_engine/rule_management/utils/utils');

const readRulesMock = readRules as jest.MockedFunction<typeof readRules>;
const transformMock = transform as jest.MockedFunction<typeof transform>;

describe('createRuleAttachmentType', () => {
  const rulesClient = {};
  const startPlugins = {
    alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(rulesClient) },
  };
  const getStartServices = jest.fn().mockResolvedValue([{}, startPlugins, {}]);
  const core = { getStartServices } as unknown as Parameters<typeof createRuleAttachmentType>[0];
  const logger = { warn: jest.fn() } as unknown as Logger;

  const makeType = () => createRuleAttachmentType(core, logger);

  const resolveCtx = { request: {} } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    getStartServices.mockResolvedValue([{}, startPlugins, {}]);
    startPlugins.alerting.getRulesClientWithRequest.mockResolvedValue(rulesClient);
  });

  it('has the rule attachment id', () => {
    expect(makeType().id).toBe('security.rule');
  });

  describe('resolve', () => {
    it('looks up the rule by saved-object id and stores the full rule (keeping rule_id/id) as attachment content', async () => {
      const transformed = {
        id: 'rule-so-id-1',
        rule_id: 'static-rule-id',
        name: 'Resolved Rule',
        type: 'query',
        query: 'process.name:"powershell.exe"',
        investigation_fields: { field_names: ['host.name', 'user.name'] },
      };
      readRulesMock.mockResolvedValueOnce({ id: 'rule-so-id-1' } as never);
      transformMock.mockReturnValueOnce(transformed as never);

      const content = await makeType().resolve!('rule-so-id-1', resolveCtx);

      // Resolves by the saved-object id, NOT by the rule_id signature.
      expect(readRulesMock).toHaveBeenCalledWith({
        rulesClient,
        id: 'rule-so-id-1',
        ruleId: undefined,
      });

      expect(content).toEqual(expect.objectContaining({ attachmentLabel: 'Resolved Rule' }));

      // Identifiers are kept in the text — investigate-rule reads them to query the rule's alerts.
      const rule = JSON.parse((content as { text: string }).text);
      expect(rule).toEqual(
        expect.objectContaining({
          id: 'rule-so-id-1',
          rule_id: 'static-rule-id',
          query: 'process.name:"powershell.exe"',
          investigation_fields: { field_names: ['host.name', 'user.name'] },
        })
      );
    });

    it('throws when no rule matches the id', async () => {
      readRulesMock.mockResolvedValueOnce(null);

      await expect(makeType().resolve!('missing-rule-so-id', resolveCtx)).rejects.toThrow(
        'Rule with id "missing-rule-so-id" was not found'
      );
    });
  });
});
