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
import { listWikiPagesRoute } from './list_wiki_pages';
import { getWikiPageRoute } from './get_wiki_page';
import { createWikiPageRoute, updateWikiPageRoute } from './write_wiki_page';
import { archiveWikiPageRoute } from './archive_wiki_page';
import { getWikiAvailabilityRoute } from './get_wiki_availability';
import { getSandboxConnectorsRoute } from './get_sandbox_connectors';
import { getSandboxConnectorTypesRoute } from './get_sandbox_connector_types';
import { sandboxAllowlistRoutes } from './sandbox_allowlist';
import { customContextRoutes } from './custom_context';
import { onboardingRoutes } from './onboarding';
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
  runAutomationRoute,
  getAutomationRunActivityRoute,
  repairAutomationRoute,
} from './automations';
import { getMemoryAvailabilityRoute } from './get_memory_availability';
import { listMemoryPagesRoute } from './list_memory_pages';
import { getMemoryPageRoute } from './get_memory_page';
import { archiveMemoryPageRoute } from './archive_memory_page';
import { deleteMemoryPageRoute } from './delete_memory_page';
import { getMemoryLineageRoute } from './get_memory_lineage';
import {
  disableInvestigatorServiceAccountRoute,
  enableInvestigatorServiceAccountRoute,
  getInvestigatorServiceAccountRoute,
} from './investigator_service_account';
import { previewKnowledgePurgeRoute, purgeKnowledgeRoute } from './purge_knowledge';

export const nightshiftInvestigationsRouteRepository = {
  ...startInvestigationRoute,
  ...emitLifecycleEventRoute,
  ...ensureInvestigationRoute,
  ...findOrCreateSlackThreadInvestigationRoute,
  ...getInvestigationAvailabilityRoute,
  ...listWikiPagesRoute,
  ...getWikiPageRoute,
  ...createWikiPageRoute,
  ...updateWikiPageRoute,
  ...archiveWikiPageRoute,
  ...getWikiAvailabilityRoute,
  ...getSandboxConnectorsRoute,
  ...getSandboxConnectorTypesRoute,
  ...sandboxAllowlistRoutes,
  ...customContextRoutes,
  ...onboardingRoutes,
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
  ...runAutomationRoute,
  ...getAutomationRunActivityRoute,
  ...repairAutomationRoute,
  ...getMemoryAvailabilityRoute,
  ...listMemoryPagesRoute,
  ...getMemoryPageRoute,
  ...archiveMemoryPageRoute,
  ...deleteMemoryPageRoute,
  ...getMemoryLineageRoute,
  ...getInvestigatorServiceAccountRoute,
  ...enableInvestigatorServiceAccountRoute,
  ...disableInvestigatorServiceAccountRoute,
  ...previewKnowledgePurgeRoute,
  ...purgeKnowledgeRoute,
};

export type NightshiftInvestigationsRouteRepository =
  typeof nightshiftInvestigationsRouteRepository;
