/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { AiRuleCreationService } from './ai_rule_creation_store';

const mockRule = { name: 'Test Rule', type: 'query', id: 'rule-1' } as RuleResponse;

describe('AiRuleCreationService', () => {
  let service: AiRuleCreationService;

  beforeEach(() => {
    service = new AiRuleCreationService();
  });

  describe('saveRuleRequest$', () => {
    it('emits the rule after requestSaveRule', async () => {
      const promise = firstValueFrom(service.saveRuleRequest$);
      service.requestSaveRule(mockRule);
      const value = await promise;
      expect(value).toEqual(mockRule);
    });
  });

  describe('session management', () => {
    it('startSession creates a new session', () => {
      const session = service.startSession();
      expect(session.sessionId).toBeDefined();
      expect(session.applyCount).toBe(0);
    });

    it('incrementApplyCount increments the apply count', () => {
      service.startSession();
      service.incrementApplyCount();
      service.incrementApplyCount();
      expect(service.getSession()?.applyCount).toBe(2);
    });

    it('clearSession sets session to null', () => {
      service.startSession();
      service.clearSession();
      expect(service.getSession()).toBeNull();
    });

    it('clearSession resets savedRuleId so the duplicate-save warning does not leak into the next session', () => {
      service.setSavedRuleId('rule-123');
      expect(service.getSavedRuleId()).toBe('rule-123');
      service.clearSession();
      expect(service.getSavedRuleId()).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('resets session to null', () => {
      service.startSession();
      service.reset();
      expect(service.getSession()).toBeNull();
    });
  });
});
