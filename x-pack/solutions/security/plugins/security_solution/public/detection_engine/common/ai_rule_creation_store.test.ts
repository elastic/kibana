/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, take, toArray } from 'rxjs';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';
import { AiRuleCreationService } from './ai_rule_creation_store';

const mockRule = { name: 'Test Rule', type: 'query', id: 'rule-1' } as RuleResponse;
const ATT_A = 'air:aaa';
const ATT_B = 'air:bbb';

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
      expect(value).toEqual({
        rule: mockRule,
        attachmentId: undefined,
        createCardVersion: undefined,
      });
    });

    it('carries the create card version and attachmentId through requestSaveRule', async () => {
      const promise = firstValueFrom(service.saveRuleRequest$);
      service.requestSaveRule(mockRule, { createCardVersion: 3, attachmentId: ATT_A });
      const value = await promise;
      expect(value).toEqual({ rule: mockRule, attachmentId: ATT_A, createCardVersion: 3 });
    });
  });

  describe('savedCreateVersions$', () => {
    it('records saved create cards keyed by (attachmentId, version) and clears them', async () => {
      const promise = firstValueFrom(service.savedCreateVersions$.pipe(take(4), toArray()));
      service.markCreateSaved(ATT_A, 1);
      service.markCreateSaved(ATT_A, 3);
      service.clearSavedCreateVersions();
      const emissions = await promise;
      expect(emissions.map((s) => [...s])).toEqual([
        [],
        [`${ATT_A}:1`],
        [`${ATT_A}:1`, `${ATT_A}:3`],
        [],
      ]);
    });

    it('saving card A-v1 does not affect card B-v1 (no cross-card collision)', async () => {
      service.markCreateSaved(ATT_A, 1);
      const versions = await firstValueFrom(service.savedCreateVersions$);
      expect(versions.has(`${ATT_A}:1`)).toBe(true);
      expect(versions.has(`${ATT_B}:1`)).toBe(false);
    });

    it('reset clears recorded saved create cards', () => {
      service.markCreateSaved(ATT_A, 2);
      service.reset();
      service.savedCreateVersions$.subscribe((versions) => {
        expect(versions.size).toBe(0);
      });
    });
  });

  describe('boundAttachmentId', () => {
    it('starts null', () => {
      expect(service.getBoundAttachmentId()).toBeNull();
    });

    it('setBoundAttachment updates the bound id', () => {
      service.setBoundAttachment(ATT_A);
      expect(service.getBoundAttachmentId()).toBe(ATT_A);
    });

    it('releaseBind sets the bound id back to null', () => {
      service.setBoundAttachment(ATT_A);
      service.releaseBind();
      expect(service.getBoundAttachmentId()).toBeNull();
    });

    it('setAiCreatedRule with attachmentId sets the bound id', () => {
      service.setAiCreatedRule(mockRule, ATT_B);
      expect(service.getBoundAttachmentId()).toBe(ATT_B);
    });

    it('setAiCreatedRule without attachmentId does not change the bound id', () => {
      service.setBoundAttachment(ATT_A);
      service.setAiCreatedRule(mockRule);
      expect(service.getBoundAttachmentId()).toBe(ATT_A);
    });

    it('reset clears the bound id', () => {
      service.setBoundAttachment(ATT_A);
      service.reset();
      expect(service.getBoundAttachmentId()).toBeNull();
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
    it('resets session to null', () => {
      service.startSession();
      service.reset();
      expect(service.getSession()).toBeNull();
    });
  });
});
