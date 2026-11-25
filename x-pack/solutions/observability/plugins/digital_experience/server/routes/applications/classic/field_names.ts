/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumAgentName } from '@kbn/elastic-agent-utils';

// The same paths as ux's `elasticsearch_fieldnames`.
export const LCP_FIELD = 'transaction.marks.agent.largestContentfulPaint';
export const INP_FIELD = 'numeric_labels.inp_value';
export const CLS_FIELD = 'transaction.experience.cls';
export const FCP_FIELD = 'transaction.marks.agent.firstContentfulPaint';
export const TTFB_FIELD = 'transaction.marks.agent.timeToFirstByte';

/** The RUM agent, not EDOT Browser (`opentelemetry/webjs`), whose data is in the same indices. */
export const CLASSIC_RUM_AGENT_NAMES: RumAgentName[] = ['rum-js', 'js-base'];

export const PAGE_LOAD_TRANSACTION_TYPE = 'page-load';
/** The RUM agent sends INP on the transaction it ends when the page is left. */
export const PAGE_EXIT_TRANSACTION_TYPE = 'page-exit';
/** The RUM agent's spans for fetch / XHR requests. */
export const EXTERNAL_SPAN_TYPE = 'external';
