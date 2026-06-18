/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Subject, distinctUntilChanged } from 'rxjs';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';

export interface AiRuleCreationSession {
  sessionId: string;
  startTimestamp: number;
  applyCount: number;
}

export interface SaveRuleRequest {
  rule: RuleResponse;
  attachmentId?: string;
  createCardVersion?: number;
}

export class AiRuleCreationService {
  private readonly saveRuleSubject = new Subject<SaveRuleRequest>();
  private readonly savingSubject = new BehaviorSubject<boolean>(false);
  private readonly aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);
  private readonly formSyncSubject = new BehaviorSubject<boolean>(false);
  // Keyed `"${attachmentId}:${version}"` so saving card A-v1 can't trigger the warning on card B-v1.
  private readonly savedCreateVersionsSubject = new BehaviorSubject<ReadonlySet<string>>(new Set());
  // `null` = form idle (no active bind). Released when a brand-new rule card is minted.
  private readonly boundAttachmentIdSubject = new BehaviorSubject<string | null>(null);
  private session: AiRuleCreationSession | null = null;

  public readonly saveRuleRequest$ = this.saveRuleSubject.asObservable();
  public readonly saving$ = this.savingSubject.pipe(distinctUntilChanged());
  public readonly aiCreatedRule$ = this.aiRuleSubject.asObservable();
  public readonly formSyncActive$ = this.formSyncSubject.pipe(distinctUntilChanged());
  public readonly savedCreateVersions$ = this.savedCreateVersionsSubject.asObservable();
  public readonly boundAttachmentId$ = this.boundAttachmentIdSubject
    .asObservable()
    .pipe(distinctUntilChanged());

  public startSession = (): AiRuleCreationSession => {
    this.session = {
      sessionId: uuidv4(),
      startTimestamp: Date.now(),
      applyCount: 0,
    };
    return this.session;
  };

  public getSession = (): AiRuleCreationSession | null => {
    return this.session;
  };

  public incrementApplyCount = (): void => {
    if (this.session) {
      this.session.applyCount += 1;
    }
  };

  public requestSaveRule = (
    rule: RuleResponse,
    options?: { createCardVersion?: number; attachmentId?: string }
  ): void => {
    this.savingSubject.next(true);
    this.saveRuleSubject.next({
      rule,
      attachmentId: options?.attachmentId,
      createCardVersion: options?.createCardVersion,
    });
  };

  public markCreateSaved = (attachmentId: string, version: number): void => {
    const key = `${attachmentId}:${version}`;
    const next = new Set(this.savedCreateVersionsSubject.getValue());
    next.add(key);
    this.savedCreateVersionsSubject.next(next);
  };

  public clearSavedCreateVersions = (): void => {
    if (this.savedCreateVersionsSubject.getValue().size > 0) {
      this.savedCreateVersionsSubject.next(new Set());
    }
  };

  public clearSaving = (): void => {
    this.savingSubject.next(false);
  };

  public getIsSaving = (): boolean => {
    return this.savingSubject.getValue();
  };

  public setAiCreatedRule = (rule: RuleResponse, attachmentId?: string): void => {
    this.aiRuleSubject.next(rule);
    if (attachmentId !== undefined) {
      this.boundAttachmentIdSubject.next(attachmentId);
    }
  };

  public setBoundAttachment = (attachmentId: string): void => {
    this.boundAttachmentIdSubject.next(attachmentId);
  };

  public releaseBind = (): void => {
    this.boundAttachmentIdSubject.next(null);
  };

  public getBoundAttachmentId = (): string | null => {
    return this.boundAttachmentIdSubject.getValue();
  };

  public clearAiCreatedRule = (): void => {
    this.aiRuleSubject.next(null);
  };

  public activateFormSync = (): void => {
    this.formSyncSubject.next(true);
  };

  public deactivateFormSync = (): void => {
    this.formSyncSubject.next(false);
  };

  public clearSession = (): void => {
    this.session = null;
  };

  public reset = (): void => {
    this.savingSubject.next(false);
    this.aiRuleSubject.next(null);
    this.formSyncSubject.next(false);
    this.savedCreateVersionsSubject.next(new Set());
    this.boundAttachmentIdSubject.next(null);
    this.session = null;
  };
}
