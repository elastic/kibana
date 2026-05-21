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

export class AiRuleCreationService {
  private readonly saveRuleSubject = new Subject<RuleResponse>();
  private readonly lastSavedRuleIdSubject = new BehaviorSubject<string | null>(null);
  private readonly dirtySubject = new BehaviorSubject<boolean>(false);
  private readonly savingSubject = new BehaviorSubject<boolean>(false);
  private readonly aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);
  private readonly formSyncSubject = new BehaviorSubject<boolean>(false);
  /**
   * Monotonically increasing sequence assigned to each rule attachment card on mount.
   * The card whose sequence matches the current value is the "active" card; older cards
   * (lower sequences) are historical.
   */
  private readonly currentAttachmentSeqSubject = new BehaviorSubject<number>(0);
  private seqCounter = 0;
  /**
   * True while a chat round is in flight (agent is reasoning / streaming / tool-calling).
   * Cards hide action buttons while busy to avoid flicker as transient events arrive.
   */
  private readonly agentBusySubject = new BehaviorSubject<boolean>(false);
  private session: AiRuleCreationSession | null = null;

  public readonly saveRuleRequest$ = this.saveRuleSubject.asObservable();
  public readonly lastSavedRuleId$ = this.lastSavedRuleIdSubject.asObservable();
  public readonly dirty$ = this.dirtySubject.pipe(distinctUntilChanged());
  public readonly saving$ = this.savingSubject.pipe(distinctUntilChanged());
  public readonly aiCreatedRule$ = this.aiRuleSubject.asObservable();
  public readonly formSyncActive$ = this.formSyncSubject.pipe(distinctUntilChanged());
  public readonly currentAttachmentSeq$ = this.currentAttachmentSeqSubject.pipe(
    distinctUntilChanged()
  );
  public readonly agentBusy$ = this.agentBusySubject.pipe(distinctUntilChanged());

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

  public requestSaveRule = (rule: RuleResponse): void => {
    this.savingSubject.next(true);
    this.saveRuleSubject.next(rule);
  };

  public clearSaving = (): void => {
    this.savingSubject.next(false);
  };

  public setLastSavedRuleId = (id: string | null): void => {
    this.lastSavedRuleIdSubject.next(id);
  };

  public getLastSavedRuleId = (): string | null => {
    return this.lastSavedRuleIdSubject.getValue();
  };

  public markDirty = (): void => {
    this.dirtySubject.next(true);
  };

  public clearDirty = (): void => {
    this.dirtySubject.next(false);
  };

  public setAiCreatedRule = (rule: RuleResponse): void => {
    this.aiRuleSubject.next(rule);
  };

  public clearAiCreatedRule = (): void => {
    this.aiRuleSubject.next(null);
  };

  public activateFormSync = (): void => {
    this.formSyncSubject.next(true);
  };

  /**
   * Called by RuleInlineContent on mount via useState lazy initializer.
   * Always allocates a new monotonically-increasing seq, so the most-recently-mounted card
   * is always the "current" one and any previously-mounted cards become historical. This
   * relies on React reusing the same component instance across in-place attachment version
   * updates (e.g. save_rule_handler's addAttachment, form-sync addAttachment) — those don't
   * re-run useState's lazy initializer, so an existing card keeps its original seq.
   */
  public claimAsCurrentAttachment = (): number => {
    this.seqCounter += 1;
    this.currentAttachmentSeqSubject.next(this.seqCounter);
    return this.seqCounter;
  };

  public getCurrentAttachmentSeq = (): number => {
    return this.currentAttachmentSeqSubject.getValue();
  };

  public setAgentBusy = (busy: boolean): void => {
    this.agentBusySubject.next(busy);
  };

  public clearSession = (): void => {
    this.session = null;
  };

  public reset = (): void => {
    this.lastSavedRuleIdSubject.next(null);
    this.dirtySubject.next(false);
    this.savingSubject.next(false);
    this.aiRuleSubject.next(null);
    this.currentAttachmentSeqSubject.next(0);
    this.seqCounter = 0;
    this.agentBusySubject.next(false);
    this.session = null;
  };
}
