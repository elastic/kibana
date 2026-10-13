/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PARTIAL_RESULTS_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.title',
  {
    defaultMessage: 'Incomplete search results',
  }
);

export const PARTIAL_RESULTS_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.body',
  {
    defaultMessage:
      'Some shards timed out or failed. Events may be missing from this hunt. Narrow the time range or query and run it again.',
  }
);

export const PARTIAL_RESULTS_WARNING_DETAILS = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.details',
  {
    defaultMessage: 'View details',
  }
);

export const PARTIAL_RESULTS_WARNING_TIMED_OUT = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.timedOut',
  {
    defaultMessage: 'The search timed out before all shards finished.',
  }
);

export const PARTIAL_RESULTS_WARNING_INDEX = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.index',
  {
    defaultMessage: 'Index',
  }
);

export const PARTIAL_RESULTS_WARNING_SHARD = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.shard',
  {
    defaultMessage: 'Shard',
  }
);

export const PARTIAL_RESULTS_WARNING_REASON = i18n.translate(
  'xpack.securitySolution.timeline.eql.partialResultsWarning.reason',
  {
    defaultMessage: 'Reason',
  }
);
