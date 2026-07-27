/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { OnboardingApiPathsProvider } from './src/api_paths';
export type { OnboardingApiPaths } from './src/api_paths';
export { hasSeenOnboarding, markOnboardingExited } from './src/first_load';
export { OnboardingLandingPage } from './src/onboarding/onboarding_landing_page';
export { IngestStep } from './src/onboarding/steps/ingest_step';
export { SearchStep } from './src/onboarding/steps/search_step';
export { ConnectToProject } from './src/connection_details/connect_to_project';
export { GETTING_STARTED_PATH } from './src/routes';
export type { OnboardingServices } from './src/services';
export { useOnboardingCredentials } from './src/hooks/use_onboarding_credentials';
export type { OnboardingCredentials } from './src/hooks/use_onboarding_credentials';
