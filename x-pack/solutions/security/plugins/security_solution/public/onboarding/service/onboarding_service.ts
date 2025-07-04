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

  private projectUrlSubject$: BehaviorSubject<string | undefined>;
  public projectUrl$: Observable<string | undefined>;

  private deploymentUrlSubject$: BehaviorSubject<string | undefined>;
  public deploymentUrl$: Observable<string | undefined>;

  constructor() {
    this.usersUrlSubject$ = new BehaviorSubject<UserUrl>(undefined);
    this.usersUrl$ = this.usersUrlSubject$.asObservable();

    this.isAgentlessAvailableSubject$ = new BehaviorSubject<IsAgentlessAvailable>(undefined);
    this.isAgentlessAvailable$ = this.isAgentlessAvailableSubject$.asObservable();

    this.projectUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.projectUrl$ = this.projectUrlSubject$.asObservable();

    this.deploymentUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.deploymentUrl$ = this.deploymentUrlSubject$.asObservable();
  }

  public setSettings({
    userUrl,
    isAgentlessAvailable,
    projectUrl,
    deploymentUrl,
  }: {
    userUrl: UserUrl;
    isAgentlessAvailable: boolean;
    projectUrl?: string;
    deploymentUrl?: string;
  }) {
    this.usersUrlSubject$.next(userUrl);
    this.isAgentlessAvailableSubject$.next(isAgentlessAvailable);
    this.projectUrlSubject$.next(projectUrl);
    this.deploymentUrlSubject$.next(deploymentUrl);
  }
}
