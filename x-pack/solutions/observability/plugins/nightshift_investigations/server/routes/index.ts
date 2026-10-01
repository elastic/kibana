/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startInvestigationRoute } from './start_investigation';
import { emitLifecycleEventRoute } from './emit_lifecycle_event';
import { ensureInvestigationRoute } from './ensure_investigation';
import { findOrCreateSlackThreadInvestigationRoute } from './find_or_create_slack_thread_investigation';
import { getInvestigationAvailabilityRoute } from './get_investigation_availability';
import { listCortexPagesRoute } from './list_cortex_pages';
import { getCortexPageRoute } from './get_cortex_page';
import { createCortexPageRoute, updateCortexPageRoute } from './write_cortex_page';
import { archiveCortexPageRoute } from './archive_cortex_page';
import { getCortexAvailabilityRoute } from './get_cortex_availability';
import { sandboxSecretsRoutes } from './sandbox_secrets';
import { getDecisionTreesAvailabilityRoute } from './get_decision_trees_availability';
import { listDecisionTreesRoute } from './list_decision_trees';
import { getDecisionTreeRoute } from './get_decision_tree';
import { listDecisionTreeVersionsRoute } from './list_decision_tree_versions';
import { getDecisionTreeVersionRoute } from './get_decision_tree_version';
import {
  createAutomationRoute,
  listAutomationsRoute,
  getAutomationRoute,
  updateAutomationRoute,
  deleteAutomationRoute,
  listAutomationRunsRoute,
} from './automations';

export const nightshiftInvestigationsRouteRepository = {
  ...startInvestigationRoute,
  ...emitLifecycleEventRoute,
  ...ensureInvestigationRoute,
  ...findOrCreateSlackThreadInvestigationRoute,
  ...getInvestigationAvailabilityRoute,
  ...listCortexPagesRoute,
  ...getCortexPageRoute,
  ...createCortexPageRoute,
  ...updateCortexPageRoute,
  ...archiveCortexPageRoute,
  ...getCortexAvailabilityRoute,
  ...sandboxSecretsRoutes,
  ...getDecisionTreesAvailabilityRoute,
  ...listDecisionTreesRoute,
  ...getDecisionTreeRoute,
  ...listDecisionTreeVersionsRoute,
  ...getDecisionTreeVersionRoute,
  ...createAutomationRoute,
  ...listAutomationsRoute,
  ...getAutomationRoute,
  ...updateAutomationRoute,
  ...deleteAutomationRoute,
  ...listAutomationRunsRoute,
};

export type NightshiftInvestigationsRouteRepository =
  typeof nightshiftInvestigationsRouteRepository;
