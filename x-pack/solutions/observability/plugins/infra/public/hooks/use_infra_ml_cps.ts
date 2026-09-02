/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsCpsMultiProject } from '@kbn/cps-utils';
import { useKibanaContextForPlugin } from './use_kibana';

/**
 * Whether CPS project scope routing applies to the Logs ML apps. Single source of truth for the
 * gate. Gates behaviour only — scope UI should render behind `useShouldRenderInfraMlCpsUi`,
 * which additionally waits for linked projects count.
 */
export const useIsInfraMlCpsEnabled = (): boolean => {
  const { services } = useKibanaContextForPlugin();
  return Boolean(services.cps?.isTierEligible && services.cps?.cpsManager);
};

/**
 * Whether the Logs ML apps should render CPS project scope UI. `true` once CPS is enabled with at
 * least one linked project, `false` once it is disabled or conclusively single-project (where scope
 * says nothing), and `undefined` while readiness is pending. Prefer rendering a loading state over
 * nothing then, so the answer arriving does not shift the layout. Only gate rendering UI with this.
 * Behaviour that must apply regardless of linked projects belongs behind `useIsInfraMlCpsEnabled`.
 */
export const useShouldRenderInfraMlCpsUi = (): boolean | undefined => {
  const { services } = useKibanaContextForPlugin();
  const isCpsEnabled = useIsInfraMlCpsEnabled();
  const isCpsMultiProject = useIsCpsMultiProject(services.cps?.cpsManager);

  return isCpsEnabled ? isCpsMultiProject : false;
};
