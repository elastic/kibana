/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AutonomyLevel,
  ScheduleMode,
  ScheduleCadence,
  ScheduleHandoff,
  ScopeAccess,
  WorkflowTriggerType,
  WatchRunAction,
  WatchSchedule,
  WatchScope,
  WatchCallableRef,
  WatchRecentRunStep,
  WatchRecentRun,
  WatchMetrics,
  WatchTriggerProjection,
  Watch,
} from './components/watch.gen';

export {
  TemplateId,
  RecommendedAction,
  ProposalStatus,
  WatchTier,
  EvidenceRef,
  TimelineEvent,
  Investigation,
  Proposal,
  Incident,
} from './components/investigation.gen';

export { ListWatchesResponse } from './watches/list_watches_route.gen';
export { GetWatchResponse } from './watches/get_watch_route.gen';
export { ListInvestigationsResponse } from './investigations/list_investigations_route.gen';
export { GetInvestigationResponse } from './investigations/get_investigation_route.gen';
export { ListInvestigationProposalsResponse } from './investigations/list_investigation_proposals_route.gen';
