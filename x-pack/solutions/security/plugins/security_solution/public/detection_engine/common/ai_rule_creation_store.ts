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

/** A save request, carrying the card id and version it was triggered from (for the duplicate guard). */
export interface SaveRuleRequest {
  rule: RuleResponse;
  /**
   * Id of the attachment card that triggered the save. Threaded through so the handler can
   * target the correct attachment when persisting the saved rule id.
   */
  attachmentId?: string;
  /** Version of the create card that requested the save. Undefined for update saves. */
  createCardVersion?: number;
}

export class AiRuleCreationService {
  private readonly saveRuleSubject = new Subject<SaveRuleRequest>();
  private readonly savingSubject = new BehaviorSubject<boolean>(false);
  private readonly aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);
  private readonly formSyncSubject = new BehaviorSubject<boolean>(false);
  /**
   * Create-card keys that have been saved in the active conversation. Keyed by
   * `"${attachmentId}:${version}"` so saving card A-v1 never triggers the warning on card B-v1.
   * Session-scoped: cleared on conversation switch and reset (the frozen `data.ruleId` label
   * remains the refresh-safe source of truth).
   */
  private readonly savedCreateVersionsSubject = new BehaviorSubject<ReadonlySet<string>>(new Set());
  /**
   * The attachment id of the rule card currently bound to the create/edit form. `null` means the
   * form is idle (no active bind). Set by "Open in form", updated by round-complete edits, and
   * released when a brand-new rule card is minted.
   */
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

  /**
   * Record that the create card at `(attachmentId, version)` has been saved (shows its duplicate
   * warning). Keyed as `"${attachmentId}:${version}"` so saving card A-v1 never warns on card B-v1.
   */
  public markCreateSaved = (attachmentId: string, version: number): void => {
    const key = `${attachmentId}:${version}`;
    const next = new Set(this.savedCreateVersionsSubject.getValue());
    next.add(key);
    this.savedCreateVersionsSubject.next(next);
  };

  /** Drop all recorded saved create cards (e.g. when the active conversation changes). */
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

  /** Set the attachment id the create/edit form is currently bound to. */
  public setBoundAttachment = (attachmentId: string): void => {
    this.boundAttachmentIdSubject.next(attachmentId);
  };

  /** Release the form bind — the form goes idle (no attachment syncing). */
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
