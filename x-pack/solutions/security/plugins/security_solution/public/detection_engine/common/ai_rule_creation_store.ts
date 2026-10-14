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

/** Links the attachment to its saved rule via `origin`; called by the save handler once persisted. */
export type UpdateAttachmentOriginFn = (origin: string) => Promise<unknown>;

export interface SaveRuleRequest {
  rule: RuleResponse;
  attachmentId?: string;
  updateOrigin?: UpdateAttachmentOriginFn;
}

/** Key for save requests that carry no attachment id. */
const UNATTACHED_SAVE_KEY = '__saving__';
const NO_SAVES: ReadonlySet<string> = new Set();

export class AiRuleCreationService {
  private readonly saveRuleSubject = new Subject<SaveRuleRequest>();
  // Attachment IDs with a save in flight; saves for different cards run concurrently.
  private readonly savingSubject = new BehaviorSubject<ReadonlySet<string>>(NO_SAVES);
  private readonly aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);
  private readonly formSyncSubject = new BehaviorSubject<boolean>(false);
  // Which attachment card this form is syncing into; null when unbound.
  private boundAttachmentId: string | null = null;
  private session: AiRuleCreationSession | null = null;

  public readonly saveRuleRequest$ = this.saveRuleSubject.asObservable();
  /** Emits the set of attachment IDs with saves in flight; empty when idle. */
  public readonly saving$ = this.savingSubject.asObservable();
  public readonly aiCreatedRule$ = this.aiRuleSubject.asObservable();
  public readonly formSyncActive$ = this.formSyncSubject.pipe(distinctUntilChanged());

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
    options?: {
      attachmentId?: string;
      updateOrigin?: UpdateAttachmentOriginFn;
    }
  ): void => {
    const key = options?.attachmentId ?? UNATTACHED_SAVE_KEY;
    // Same-card double-submit guard; the handler saves each card's request concurrently.
    if (this.savingSubject.getValue().has(key)) {
      return;
    }
    this.savingSubject.next(new Set([...this.savingSubject.getValue(), key]));
    this.saveRuleSubject.next({
      rule,
      attachmentId: options?.attachmentId,
      updateOrigin: options?.updateOrigin,
    });
  };

  public clearSaving = (attachmentId?: string): void => {
    const key = attachmentId ?? UNATTACHED_SAVE_KEY;
    const current = this.savingSubject.getValue();
    if (!current.has(key)) {
      return;
    }
    const next = new Set(current);
    next.delete(key);
    this.savingSubject.next(next);
  };

  public getIsSaving = (attachmentId?: string): boolean => {
    const current = this.savingSubject.getValue();
    return attachmentId !== undefined ? current.has(attachmentId) : current.size > 0;
  };

  public setAiCreatedRule = (rule: RuleResponse, attachmentId?: string): void => {
    this.aiRuleSubject.next(rule);
    if (attachmentId !== undefined) {
      this.boundAttachmentId = attachmentId;
    }
  };

  public setBoundAttachment = (attachmentId: string): void => {
    this.boundAttachmentId = attachmentId;
  };

  public releaseBind = (): void => {
    this.boundAttachmentId = null;
  };

  public getBoundAttachmentId = (): string | null => {
    return this.boundAttachmentId;
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
    this.savingSubject.next(NO_SAVES);
    this.aiRuleSubject.next(null);
    this.formSyncSubject.next(false);
    this.boundAttachmentId = null;
    this.session = null;
  };
}
