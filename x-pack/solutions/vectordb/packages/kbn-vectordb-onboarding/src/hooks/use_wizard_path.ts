/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import type { VectorPath } from '../onboarding/types';
import { ONBOARDING_PATH, TUTORIALS_PATH } from '../routes';

const isVectorPath = (value: string): value is VectorPath =>
  value === 'have-vectors' || value === 'generate-vectors';

export const useWizardPath = (): VectorPath | null => {
  const { search } = useLocation();
  const value = new URLSearchParams(search).get('path');
  return value && isVectorPath(value) ? value : null;
};

export const pathQuery = (path: VectorPath): string => `?path=${path}`;
interface OnboardingLocationState {
  origin?: string;
}

/**
 * The page the wizard was entered from, so steps can navigate back to it. The
 * origin is forwarded via navigation `state` by `useOnboardingNavigate`.
 * Defaults to the tutorials page when the origin is missing or unrecognized.
 */
export const useReturnPath = (): string => {
  const { state } = useLocation<OnboardingLocationState | undefined>();
  return state?.origin === ONBOARDING_PATH ? ONBOARDING_PATH : TUTORIALS_PATH;
};
