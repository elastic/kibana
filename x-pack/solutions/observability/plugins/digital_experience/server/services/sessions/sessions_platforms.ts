/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOBILE_SESSIONS_INDEX,
  MOBILE_SESSIONS_TASK_ID,
  MOBILE_SESSIONS_TASK_TYPE,
  MOBILE_SESSIONS_VERSION,
  SESSIONS_INDEX,
  SESSIONS_TASK_ID,
  SESSIONS_TASK_TYPE,
  SESSIONS_VERSION,
} from '../../../common/sessions';
import { mobileSessionsIndexTemplate } from './mobile_sessions_index';
import { toMobileSessionDocuments } from './mobile_summary_documents';
import { mobileSessionEvents, mobileSessionSummaryQuery } from './mobile_summary_queries';
import { sessionsIndexTemplate, type SessionsIndex } from './sessions_index';
import { toSessionDocuments, type EsqlRow } from './summary_documents';
import {
  browserSessionEvents,
  sessionSummaryQuery,
  type SessionEvents,
  type SummaryQueryOf,
} from './summary_queries';

/** What every platform's summary has: its document id is made of them. */
export interface SummaryDocument {
  session: { id: string };
  service: { name: string };
}

/** A platform whose sessions a task of its own summarizes into an index of its own. */
export interface SessionsPlatform extends SessionsIndex {
  name: string;
  /** Names the platform's sessions in logs, e.g. `Digital Experience mobile sessions`. */
  label: string;
  /** The version of the summaries this Kibana builds; another one rebuilds them all. */
  version: number;
  events: SessionEvents;
  summaryQuery: SummaryQueryOf;
  toDocuments: (rows: EsqlRow[]) => SummaryDocument[];
  taskType: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  /** Rebuilds the recent sessions every so often, for a platform whose events arrive late. */
  reconcile: boolean;
}

export const BROWSER_SESSIONS_PLATFORM: SessionsPlatform = {
  name: 'browser',
  label: 'Digital Experience sessions',
  version: SESSIONS_VERSION,
  index: SESSIONS_INDEX,
  indexTemplate: sessionsIndexTemplate,
  events: browserSessionEvents,
  summaryQuery: sessionSummaryQuery,
  toDocuments: toSessionDocuments,
  taskType: SESSIONS_TASK_TYPE,
  taskId: SESSIONS_TASK_ID,
  taskTitle: 'Digital Experience session summaries',
  taskDescription:
    'Summarizes the RUM sessions with new events into the Digital Experience sessions index.',
  reconcile: false,
};

export const MOBILE_SESSIONS_PLATFORM: SessionsPlatform = {
  name: 'mobile',
  label: 'Digital Experience mobile sessions',
  version: MOBILE_SESSIONS_VERSION,
  index: MOBILE_SESSIONS_INDEX,
  indexTemplate: mobileSessionsIndexTemplate,
  events: mobileSessionEvents,
  summaryQuery: mobileSessionSummaryQuery,
  toDocuments: toMobileSessionDocuments,
  taskType: MOBILE_SESSIONS_TASK_TYPE,
  taskId: MOBILE_SESSIONS_TASK_ID,
  taskTitle: 'Digital Experience mobile session summaries',
  taskDescription:
    'Summarizes the EDOT Android and EDOT iOS sessions with new events into the Digital Experience mobile sessions index.',
  reconcile: true,
};

export const SESSIONS_PLATFORMS: readonly SessionsPlatform[] = [
  BROWSER_SESSIONS_PLATFORM,
  MOBILE_SESSIONS_PLATFORM,
];
