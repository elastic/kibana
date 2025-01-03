/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';

type UserUrl = string | undefined;
type IsAgentlessAvailable = boolean | undefined;

export class OnboardingService {
  private usersUrlSubject$: BehaviorSubject<UserUrl>;
  public usersUrl$: Observable<UserUrl>;

  private isAgentlessAvailableSubject$: BehaviorSubject<IsAgentlessAvailable>;
  public isAgentlessAvailable$: Observable<IsAgentlessAvailable>;

  constructor() {
    this.usersUrlSubject$ = new BehaviorSubject<UserUrl>(undefined);
    this.usersUrl$ = this.usersUrlSubject$.asObservable();

    this.isAgentlessAvailableSubject$ = new BehaviorSubject<IsAgentlessAvailable>(undefined);
    this.isAgentlessAvailable$ = this.isAgentlessAvailableSubject$.asObservable();
  }

  public setSettings({
    userUrl,
    isAgentlessAvailable,
  }: {
    userUrl: UserUrl;
    isAgentlessAvailable: boolean;
  }) {
    this.usersUrlSubject$.next(userUrl);
    this.isAgentlessAvailableSubject$.next(isAgentlessAvailable);
  }
}
