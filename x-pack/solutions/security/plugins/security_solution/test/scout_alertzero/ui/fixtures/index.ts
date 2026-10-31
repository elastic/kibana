/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as spaceBaseTest, test as baseTest, apiTest, tags } from '@kbn/scout-security';
import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from '@kbn/scout-security';
import { extendPageObjects, type AlertZeroPageObjects } from './page_objects';

export interface AlertZeroTestFixtures {
  pageObjects: AlertZeroPageObjects;
}

const pageObjects = async (
  { pageObjects: base, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
  use: (pageObjects: AlertZeroPageObjects) => Promise<void>
) => {
  await use(extendPageObjects(base, page));
};

export const test = baseTest.extend<
  SecurityTestFixtures & AlertZeroTestFixtures,
  SecurityWorkerFixtures
>({ pageObjects });

export const spaceTest = spaceBaseTest.extend<AlertZeroTestFixtures>({ pageObjects });

export { apiTest, tags };
export * as testData from './constants';
export { ALERTZERO_READ_ONLY_ROLE, TI_HEADERS } from './constants';
export {
  createApi,
  createApiFromKbnClient,
  createWorkerServiceAccount,
  isWorkerEnableBlocked,
  listWorkers,
  ok,
  patchWorker,
  pollUntil,
  seedStubModel,
  setAlertZeroEnabledInSpace,
  spaceUrl,
  type AlertZeroApi,
  type ApiResult,
  type WorkerInfo,
} from './helpers';
export {
  createOnboardingSpace,
  createUiOnboardingSpace,
  deleteSeededProposals,
  enableFirstWorker,
  resetOnboardingState,
  seedClosedProposal,
  type OnboardingSpace,
  type SeededProposal,
  type SpacesService,
} from './onboarding';
