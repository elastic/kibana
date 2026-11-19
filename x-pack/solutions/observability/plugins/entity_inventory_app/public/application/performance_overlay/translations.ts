/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BADGE_LABEL = (value: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.badgeLabel', {
    defaultMessage: '_list {value} ms',
    values: { value },
  });

export const BADGE_ARIA_LABEL = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.badgeAriaLabel',
  { defaultMessage: 'Open the performance overlay' }
);
export const FLYOUT_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.flyoutTitle',
  { defaultMessage: 'Inventory performance' }
);
export const CLEAR_BUTTON = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.clearButton',
  { defaultMessage: 'Clear' }
);
export const HISTORY_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.historyTitle',
  { defaultMessage: 'Recent API calls' }
);
export const NO_CALLS = i18n.translate('xpack.entityInventoryApp.performanceOverlay.noCalls', {
  defaultMessage: 'No API calls recorded yet.',
});
export const NO_LIST_SELECTED = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.noListSelected',
  { defaultMessage: 'Select a successful _list call to see its breakdown.' }
);

export const STATUS_LABELS = {
  ok: i18n.translate('xpack.entityInventoryApp.performanceOverlay.status.ok', {
    defaultMessage: 'OK',
  }),
  error: i18n.translate('xpack.entityInventoryApp.performanceOverlay.status.error', {
    defaultMessage: 'Error',
  }),
  aborted: i18n.translate('xpack.entityInventoryApp.performanceOverlay.status.aborted', {
    defaultMessage: 'Aborted',
  }),
} as const;

export const HISTORY_COLUMNS = {
  time: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.time', {
    defaultMessage: 'Time',
  }),
  route: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.route', {
    defaultMessage: 'Route',
  }),
  status: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.status', {
    defaultMessage: 'Status',
  }),
  browserMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.browserMs', {
    defaultMessage: 'Browser (ms)',
  }),
  serverMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.serverMs', {
    defaultMessage: 'Server (ms)',
  }),
} as const;

export const SUMMARY_TITLE = (route: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.summaryTitle', {
    defaultMessage: 'Request {route}',
    values: { route },
  });
export const SUMMARY = {
  browserMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.browserMs', {
    defaultMessage: 'Browser end to end (ms)',
  }),
  browserMsHelp: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.summary.browserMsHelp',
    { defaultMessage: 'Around the fetch in the browser: network, server and JSON parsing.' }
  ),
  serverTotalMs: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.summary.serverTotalMs',
    { defaultMessage: 'Server total (ms)' }
  ),
  serverTook: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.serverTook', {
    defaultMessage: 'Server took (ms)',
  }),
  gapMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.gapMs', {
    defaultMessage: 'Network and serialization (ms)',
  }),
  definitionMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.definitionMs', {
    defaultMessage: 'Definition lookup (ms)',
  }),
  planningMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.planningMs', {
    defaultMessage: 'Planning, probes included (ms)',
  }),
  probesMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.probesMs', {
    defaultMessage: 'Probes (ms)',
  }),
  queriesMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.queriesMs', {
    defaultMessage: 'Query fan-out wall (ms)',
  }),
  processingMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.processingMs', {
    defaultMessage: 'Processing (ms)',
  }),
  slowestTook: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.slowestTook', {
    defaultMessage: 'Slowest query, ES took (ms)',
  }),
  sumTook: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.sumTook', {
    defaultMessage: 'Sum of ES took over queries (ms)',
  }),
  concurrencyHelp: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.summary.concurrencyHelp',
    {
      defaultMessage:
        'Queries run concurrently after the probes: the fan-out wall is about the slowest query, the sum of ES took is the total Elasticsearch work.',
    }
  ),
  rows: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.rows', {
    defaultMessage: 'Rows returned',
  }),
  truncated: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.truncated', {
    defaultMessage: 'Truncated',
  }),
  errors: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.errors', {
    defaultMessage: 'Source errors',
  }),
} as const;

export const YES = i18n.translate('xpack.entityInventoryApp.performanceOverlay.yes', {
  defaultMessage: 'yes',
});
export const NO = i18n.translate('xpack.entityInventoryApp.performanceOverlay.no', {
  defaultMessage: 'no',
});

export const QUERIES_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.queriesTitle',
  { defaultMessage: 'Queries' }
);
export const PROBES_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.probesTitle',
  { defaultMessage: 'Probes' }
);
export const ESQL_TITLE = i18n.translate('xpack.entityInventoryApp.performanceOverlay.esqlTitle', {
  defaultMessage: 'ES|QL and params',
});

export const STATS_COLUMNS = {
  indexPattern: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.indexPattern', {
    defaultMessage: 'Index pattern',
  }),
  engine: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.engine', {
    defaultMessage: 'Engine',
  }),
  outcome: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.outcome', {
    defaultMessage: 'Outcome',
  }),
  wallMs: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.wallMs', {
    defaultMessage: 'Wall (ms)',
  }),
  took: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.took', {
    defaultMessage: 'ES took (ms)',
  }),
  cpu: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.cpu', {
    defaultMessage: 'CPU (sum, ms)',
  }),
  driver: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.driver', {
    defaultMessage: 'Driver time (sum, ms)',
  }),
  documentsFound: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.stats.documentsFound',
    { defaultMessage: 'Documents found' }
  ),
  valuesLoaded: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.valuesLoaded', {
    defaultMessage: 'Values loaded',
  }),
  rowsEmitted: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.rowsEmitted', {
    defaultMessage: 'Rows emitted',
  }),
  bytesRead: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.bytesRead', {
    defaultMessage: 'Bytes read',
  }),
  rowCount: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.rowCount', {
    defaultMessage: 'Rows returned',
  }),
  shards: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.shards', {
    defaultMessage: 'Shards',
  }),
  partial: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.partial', {
    defaultMessage: 'Partial',
  }),
  error: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stats.error', {
    defaultMessage: 'Error',
  }),
} as const;

export const SHARDS_SKIPPED = (count: number): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.shards.skipped', {
    defaultMessage: '{count} skipped',
    values: { count },
  });

export const SHARDS_FAILED = (count: number): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.shards.failed', {
    defaultMessage: '{count} failed',
    values: { count },
  });

export const QUERY_ACCORDION_LABEL = (index: number, indexPattern: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.queryAccordionLabel', {
    defaultMessage: 'Query {index}: {indexPattern}',
    values: { index, indexPattern },
  });

export const PROBE_ACCORDION_LABEL = (indexPattern: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.probeAccordionLabel', {
    defaultMessage: 'Probe: {indexPattern}',
    values: { indexPattern },
  });
