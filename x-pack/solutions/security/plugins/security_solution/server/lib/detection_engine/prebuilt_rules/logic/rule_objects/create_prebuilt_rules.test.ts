/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionRulesClientMock } from '../../../rule_management/logic/detection_rules_client/__mocks__/detection_rules_client';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { createPrebuiltRules } from './create_prebuilt_rules';

const asset = (ruleId: string) => ({ rule_id: ruleId, version: 1 } as unknown as PrebuiltRuleAsset);

describe('createPrebuiltRules', () => {
  let detectionRulesClient: ReturnType<typeof detectionRulesClientMock.create>;

  beforeEach(() => {
    detectionRulesClient = detectionRulesClientMock.create();
  });

  // The install pool creates rules one at a time; without this each rule would fire its own event.
  it('creates each rule without a per-rule event and reports all of them in one', async () => {
    detectionRulesClient.createPrebuiltRule.mockImplementation(async ({ params }) => ({
      ...getRulesSchemaMock(),
      id: `so-${params.rule_id}`,
      rule_id: params.rule_id as string,
      tags: ['Elastic'],
    }));

    await createPrebuiltRules(detectionRulesClient, [asset('r1'), asset('r2'), asset('r3')]);

    expect(detectionRulesClient.createPrebuiltRule).toHaveBeenCalledTimes(3);
    detectionRulesClient.createPrebuiltRule.mock.calls.forEach(([args]) =>
      expect(args.suppressCreatedEvent).toBe(true)
    );
    expect(detectionRulesClient.notifyRulesCreated).toHaveBeenCalledTimes(1);
    const [{ rules, source }] = detectionRulesClient.notifyRulesCreated.mock.calls[0];
    expect(source).toBe('prebuilt_install');
    expect(rules.map(({ id }) => id).sort()).toEqual(['so-r1', 'so-r2', 'so-r3']);
  });

  it('still reports the rules that were created when others fail', async () => {
    detectionRulesClient.createPrebuiltRule.mockImplementation(async ({ params }) => {
      if (params.rule_id === 'bad') throw new Error('boom');
      return {
        ...getRulesSchemaMock(),
        id: `so-${params.rule_id}`,
        rule_id: params.rule_id as string,
      };
    });

    const { errors } = await createPrebuiltRules(detectionRulesClient, [asset('ok'), asset('bad')]);

    expect(errors).toHaveLength(1);
    expect(detectionRulesClient.notifyRulesCreated).toHaveBeenCalledTimes(1);
    const [{ rules }] = detectionRulesClient.notifyRulesCreated.mock.calls[0];
    expect(rules.map(({ rule_id: ruleId }) => ruleId)).toEqual(['ok']);
  });
});
