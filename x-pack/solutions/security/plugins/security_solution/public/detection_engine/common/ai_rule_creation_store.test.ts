/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { AiRuleCreationService } from './ai_rule_creation_store';

const mockRule = { name: 'Test Rule', type: 'query' } as RuleResponse;

describe('AiRuleCreationService', () => {
  let service: AiRuleCreationService;

  beforeEach(() => {
    service = new AiRuleCreationService();
  });

  describe('aiCreatedRule$', () => {
    it('initially emits null', async () => {
      const value = await firstValueFrom(service.aiCreatedRule$);
      expect(value).toBeNull();
    });

    it('emits the rule after setAiCreatedRule', async () => {
      service.setAiCreatedRule(mockRule);
      const value = await firstValueFrom(service.aiCreatedRule$);
      expect(value).toEqual(mockRule);
    });

    it('emits null after clearAiCreatedRule', async () => {
      service.setAiCreatedRule(mockRule);
      service.clearAiCreatedRule();
      const value = await firstValueFrom(service.aiCreatedRule$);
      expect(value).toBeNull();
    });
  });

  describe('formSyncActive$', () => {
    it('initially emits false', async () => {
      const value = await firstValueFrom(service.formSyncActive$);
      expect(value).toBe(false);
    });

    it('emits true after activateFormSync', async () => {
      service.activateFormSync();
      const value = await firstValueFrom(service.formSyncActive$);
      expect(value).toBe(true);
    });

    it('deduplicates consecutive identical values via distinctUntilChanged', () => {
      const emissions: boolean[] = [];
      const subscription = service.formSyncActive$.subscribe((v) => emissions.push(v));

      service.activateFormSync();
      service.activateFormSync();
      service.activateFormSync();

      subscription.unsubscribe();
      expect(emissions).toEqual([false, true]);
    });
  });

  describe('reset', () => {
    it('resets aiCreatedRule$ to null', async () => {
      service.setAiCreatedRule(mockRule);
      service.reset();
      const value = await firstValueFrom(service.aiCreatedRule$);
      expect(value).toBeNull();
    });

    it('resets formSyncActive$ to false', async () => {
      service.activateFormSync();
      service.reset();
      const value = await firstValueFrom(service.formSyncActive$);
      expect(value).toBe(false);
    });
  });

  it('each instance maintains independent state', async () => {
    const other = new AiRuleCreationService();

    service.setAiCreatedRule(mockRule);
    service.activateFormSync();

    expect(await firstValueFrom(other.aiCreatedRule$)).toBeNull();
    expect(await firstValueFrom(other.formSyncActive$)).toBe(false);
  });
});
