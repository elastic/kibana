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
  private readonly aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);
  private readonly formSyncSubject = new BehaviorSubject<boolean>(false);
  private session: AiRuleCreationSession | null = null;

  public readonly saveRuleRequest$ = this.saveRuleSubject.asObservable();
  public readonly lastSavedRuleId$ = this.lastSavedRuleIdSubject.asObservable();
  public readonly dirty$ = this.dirtySubject.asObservable();
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

  public requestSaveRule = (rule: RuleResponse): void => {
    this.saveRuleSubject.next(rule);
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

  public clearSession = (): void => {
    this.session = null;
  };

  public reset = (): void => {
    this.lastSavedRuleIdSubject.next(null);
    this.dirtySubject.next(false);
    this.aiRuleSubject.next(null);
    this.session = null;
  };
}
