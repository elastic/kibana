/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';

export type ContractComponents = Partial<{
  GetStarted: React.ComponentType<{ indicesExist?: boolean }>;
  DashboardsLandingCallout: React.ComponentType<{}>;
  EnablementModalCallout: React.ComponentType<{}>;
}>;

export type SetComponents = (components: ContractComponents) => void;
export type GetComponents$ = () => Observable<ContractComponents>;

export class ContractComponentsService {
  private components$: BehaviorSubject<ContractComponents>;

  constructor() {
    this.components$ = new BehaviorSubject<ContractComponents>({});
  }

  public setComponents: SetComponents = (components) => {
    this.components$.next(components);
  };

  public getComponents$ = () => this.components$.asObservable();
}
