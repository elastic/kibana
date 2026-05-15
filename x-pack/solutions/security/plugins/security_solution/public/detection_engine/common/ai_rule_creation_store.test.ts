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

  describe('lastSavedRuleId$', () => {
    it('initially emits null', async () => {
      const value = await firstValueFrom(service.lastSavedRuleId$);
      expect(value).toBeNull();
    });

    it('emits the id after setLastSavedRuleId', async () => {
      service.setLastSavedRuleId('rule-1');
      const value = await firstValueFrom(service.lastSavedRuleId$);
      expect(value).toBe('rule-1');
    });

    it('getLastSavedRuleId returns current value synchronously', () => {
      expect(service.getLastSavedRuleId()).toBeNull();
      service.setLastSavedRuleId('rule-1');
      expect(service.getLastSavedRuleId()).toBe('rule-1');
    });
  });

  describe('dirty$', () => {
    it('initially emits false', async () => {
      const value = await firstValueFrom(service.dirty$);
      expect(value).toBe(false);
    });

    it('emits true after markDirty', async () => {
      service.markDirty();
      const value = await firstValueFrom(service.dirty$);
      expect(value).toBe(true);
    });

    it('emits false after clearDirty', async () => {
      service.markDirty();
      service.clearDirty();
      const value = await firstValueFrom(service.dirty$);
      expect(value).toBe(false);
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
  });

  describe('reset', () => {
    it('resets lastSavedRuleId$ to null', async () => {
      service.setLastSavedRuleId('rule-1');
      service.reset();
      const value = await firstValueFrom(service.lastSavedRuleId$);
      expect(value).toBeNull();
    });

    it('resets dirty$ to false', async () => {
      service.markDirty();
      service.reset();
      const value = await firstValueFrom(service.dirty$);
      expect(value).toBe(false);
    });

    it('resets session to null', () => {
      service.startSession();
      service.reset();
      expect(service.getSession()).toBeNull();
    });
  });

  it('each instance maintains independent state', async () => {
    const other = new AiRuleCreationService();

    service.setLastSavedRuleId('rule-1');
    service.markDirty();

    expect(await firstValueFrom(other.lastSavedRuleId$)).toBeNull();
    expect(await firstValueFrom(other.dirty$)).toBe(false);
  });
});
