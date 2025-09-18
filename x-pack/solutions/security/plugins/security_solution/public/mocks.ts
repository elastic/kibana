/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { allowedExperimentalValues } from '@kbn/experimental-features';
import type { BreadcrumbsNav } from './common/breadcrumbs';
import type { ContractStartServices, PluginSetup, PluginStart } from './types';
import { OnboardingService } from './onboarding/service';

const upselling = new UpsellingService();
const onboardingService = new OnboardingService();

export const contractStartServicesMock: ContractStartServices = {
  getComponents$: jest.fn(() => of({})),
  upselling,
  onboarding: onboardingService,
};

const setupMock = (): PluginSetup => ({
  resolver: jest.fn(),
  experimentalFeatures: allowedExperimentalValues, // default values,
  setProductFeatureKeys: jest.fn(),
});

const startMock = (): PluginStart => ({
  setComponents: jest.fn(),
  getBreadcrumbsNav$: jest.fn(
    () => new BehaviorSubject<BreadcrumbsNav>({ leading: [], trailing: [] })
  ),
  getUpselling: () => upselling,
  setOnboardingSettings: onboardingService.setSettings.bind(onboardingService),
  setSolutionNavigationTree: jest.fn(),
});

export const securitySolutionMock = {
  createSetup: setupMock,
  createStart: startMock,
};
