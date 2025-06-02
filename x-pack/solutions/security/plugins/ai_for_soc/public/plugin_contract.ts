/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type {
  ProductFeatureKeyType,
  ProductFeatureKeys,
} from '@kbn/security-solution-features/src/types';
import { ContractComponentsService } from '@kbn/security-solution-plugin/public';
import { OnboardingService } from '@kbn/security-solution-plugin/public';
import { SecuritySolutionAiForSocPluginSetup } from './types';

export class PluginContract {
  public componentsService: ContractComponentsService;
  public upsellingService: UpsellingService;
  public onboardingService: OnboardingService;
  public solutionNavigationTree$: BehaviorSubject<NavigationTreeDefinition | null>;
  public productFeatureKeys$: BehaviorSubject<Set<ProductFeatureKeyType> | null>;

  constructor() {
    this.onboardingService = new OnboardingService();
    this.componentsService = new ContractComponentsService();
    this.upsellingService = new UpsellingService();
    this.solutionNavigationTree$ = new BehaviorSubject<NavigationTreeDefinition | null>(null); // defaults to classic navigation
    this.productFeatureKeys$ = new BehaviorSubject<Set<ProductFeatureKeyType> | null>(null);
  }

  public getSetupContract(): SecuritySolutionAiForSocPluginSetup {
    return {
      // resolver: lazyResolver,
      setProductFeatureKeys: (productFeatureKeys: ProductFeatureKeys) => {
        this.productFeatureKeys$.next(new Set(productFeatureKeys));
      },
    };
  }

  public getStartServices() {
    return {
      getComponents$: this.componentsService.getComponents$.bind(this.componentsService),
      upselling: this.upsellingService,
      onboarding: this.onboardingService,
    };
  }
}
