/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { PndConfig } from '../config';
import type {
  PndEsClientAccessor,
  PndSpaceIdResolver,
  PndStartServicesAccessor,
  PndWorkflowsManagementClientAccessor,
} from '../types';
import type { WatchesService } from '../services/watches/watches_service';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerUpdateWatchRoute } from './watches/update_watch';
import { registerEnsureWatchScheduleRoute } from './watches/ensure_watch_schedule';
import { registerListWorkersRoute } from './workers/list_workers';
import { registerUpdateWorkerRoute } from './workers/update_worker';
import { registerListSkillsRoute } from './skills/list_skills';
import { registerUpdateSkillRoute } from './skills/update_skill';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';
import { registerGetAutonomyRoute } from './get/autonomy/get_autonomy';
import { registerPutAutonomyRoute } from './put/autonomy/put_autonomy';
import { registerGetConversationAttachmentsRoute } from './get/conversation_attachments/get_conversation_attachments';
import { registerDeriveConversationIdsRoute } from './get/conversations/derive_conversation_ids';
import { registerGetDiscoveryContextRoute } from './get/discovery_context/get_discovery_context';
import { registerListConversationsRoute } from './get/conversations/list_conversations';
import { registerListProposalHistoryRoute } from './get/proposals/list_proposal_history';
import { registerListProposalsRoute } from './get/proposals/list_proposals';
import { registerGetProposalsActivityRoute } from './get/proposals_activity/get_proposals_activity';
import { registerListRunsRoute } from './get/runs/list_runs';
import { registerGetExecutionRoute } from './get/executions/get_executions';
import { registerGetTuningCandidateRulesRoute } from './get/tuning_candidate_rules/get_tuning_candidate_rules';
import { registerRespondToProposalRoute } from './post/proposals/respond_to_proposal';
import { registerAutoRespondToProposalsRoute } from './post/proposals/auto_respond_to_proposals';
import { registerEmitDetectionChangeSignalRoute } from './post/signals/emit_detection_change_signal';
import { registerEnsureThreadRoute } from './post/threads_ensure/ensure_thread';
import { registerApplyTuningRoute } from './post/tuning/apply_tuning';

export interface RouteDependencies {
  router: IRouter;
  /**
   * Already wrapped by `createPndLogger`, so **every** message a route emits through it carries the
   * `[kibana-pnd]` marker the README documents for grepping (finding R3). Write plain messages —
   * spelling the prefix out is harmless (the stamp is idempotent) but unnecessary. Two things do
   * drop the marker: logging an `Error` object rather than a string, and reaching for a logger that
   * did not come from here.
   */
  logger: Logger;
  config: PndConfig;
  /**
   * The request's scoped Elasticsearch client (decision D3).
   *
   * PND otherwise reads every derived surface over HTTP as the caller (README decision D7), and it
   * still should: an HTTP self-call inherits the callee route's own authorization. The two Brief
   * derivations are the deliberate exceptions, because neither has an HTTP route that could serve
   * it — the blast radius is a `terms` aggregation over detection alerts, and the sparkline is a
   * `date_histogram` over step executions, and the Workflows management API exposes no aggregation
   * method. Adding one would be a `@elastic/workflows-eng` CODEOWNERS change.
   *
   * Handed through the dependencies rather than read off `context` in each handler so both
   * derivations reach Elasticsearch the same way, and so a route test can supply a client without
   * standing up a core request-handler context.
   */
  getEsClient: PndEsClientAccessor;
  getSpaceId: PndSpaceIdResolver;
  getStartServices: PndStartServicesAccessor;
  getWatchesService: () => WatchesService;
  getWorkflowsManagementClient: PndWorkflowsManagementClientAccessor;
}

/**
 * Register every PND internal route.
 *
 * ⚠️ **Two proposal read paths are registered here, and they share one contract** (register #45).
 * Plan B0 removed the three `/internal/pnd/investigations*` routes because they served
 * `MOCK_INVESTIGATIONS` fixtures behind `xpack.pnd.ui.useMockData` and `[]` otherwise, so keeping
 * them beside the real HITL proposals queue gave the Brief two competing data sources — real gates
 * beside fixtures. That reasoning still holds, but
 * [#284440](https://github.com/elastic/kibana/pull/284440) then shipped a conversation-queue
 * surface that reads them, so removing them again would break merged code. They are restored at
 * upstream's exact paths, route ids and `PND_API_PRIVILEGE_READ` authz.
 *
 * `kibana-phf4.29` resolved the overlap in the direction the alignment rule requires — one contract,
 * and it is the real one. `.../{id}/proposals` no longer answers `[]` in live mode: it reads the same
 * parked-gate projection `GET /internal/pnd/proposals` serves (`readPendingProposalRows`), filters it
 * to the addressed investigation and projects each row onto the `Proposal` type, which was widened
 * additively to carry what a real gate has. So there are two *paths* and one *pipe*. The remaining
 * duplication is `list_investigations` and `get_investigation`, which are still fixtures-or-nothing
 * because no live Investigation object exists yet to project — `.32` owns that surface.
 *
 * `kibana-phf4.30` then collapsed the two queue *components* into one at #284440's paths, so the
 * queue at `/` reads `GET /internal/pnd/proposals` and nothing else. `kibana-phf4.32` then collapsed
 * the two **detail surfaces**: decision 1 of the 2026-08-17 Experience/UX sync makes the lifecycle
 * flyout the only one, so `pages/investigations/investigation_detail.tsx` is deleted and upstream's
 * two `/investigations/*` **browser** paths are kept in `public/routes.tsx` as deep links that open
 * that flyout. Their addressing, our internals.
 *
 * So **nothing in the browser reads these three routes any more.** `hooks/use_investigations_api.ts`
 * stays: it is a correct, S11-guarded client for routes that are still registered here at upstream's
 * exact paths, and deleting a client for a live route is how the next surface that needs it ends up
 * writing a second one. `list_investigations` and `get_investigation` are still
 * fixtures-under-`useMockData` and `[]`/404 otherwise, because no live `Investigation` object exists
 * to project — that is the remaining duplication, and it is a data-layer gap rather than a UI one now.
 *
 * Three single-conversation routes are absent for a second reason (register `#23`, ADR-016):
 * `GET`, `DELETE` and `_rename` on `/internal/pnd/conversations/{conversationId}` shipped
 * S11-guarded but were never called by anything. The watches rename their own threads by calling
 * **Agent Builder's** `_rename` directly, and `access: 'owner'` means an analyst who can read a
 * workflow-created thread would get a 404 from ours anyway (D9). Four conversation routes remain:
 * `list_conversations`, `get_conversation_attachments`, `_derive` and `_ensure`.
 */
export const registerRoutes = (deps: RouteDependencies): void => {
  registerListWatchesRoute(deps);
  registerGetWatchRoute(deps);
  registerUpdateWatchRoute(deps);
  registerEnsureWatchScheduleRoute(deps);
  registerListWorkersRoute(deps);
  registerUpdateWorkerRoute(deps);
  registerListSkillsRoute(deps);
  registerUpdateSkillRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerListInvestigationProposalsRoute(deps);
  registerGetAutonomyRoute(deps);
  registerPutAutonomyRoute(deps);
  registerDeriveConversationIdsRoute(deps);
  registerGetConversationAttachmentsRoute(deps);
  registerGetDiscoveryContextRoute(deps);
  registerListConversationsRoute(deps);
  registerListProposalsRoute(deps);
  registerListProposalHistoryRoute(deps);
  registerGetProposalsActivityRoute(deps);
  registerListRunsRoute(deps);
  registerGetExecutionRoute(deps);
  registerGetTuningCandidateRulesRoute(deps);
  registerRespondToProposalRoute(deps);
  registerAutoRespondToProposalsRoute(deps);
  registerEmitDetectionChangeSignalRoute(deps);
  registerEnsureThreadRoute(deps);
  registerApplyTuningRoute(deps);
};
