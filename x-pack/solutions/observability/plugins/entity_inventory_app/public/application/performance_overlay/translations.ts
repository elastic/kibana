/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BADGE_LABEL = (duration: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.badgeLabel', {
    defaultMessage: 'Inventory performance · {duration}',
    values: { duration },
  });

export const BADGE_TOOLTIP = (request: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.badgeTooltip', {
    defaultMessage: 'Browser round trip, latest request: {request}',
    values: { request },
  });

export const BADGE_TOOLTIP_EMPTY = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.badgeTooltipEmpty',
  { defaultMessage: 'No request yet' }
);

export const FLYOUT_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.flyoutTitle',
  {
    defaultMessage: 'Inventory performance',
  }
);

export const CLEAR_BUTTON = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.clearButton',
  {
    defaultMessage: 'Clear',
  }
);

export const HISTORY_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.historyTitle',
  {
    defaultMessage: 'History',
  }
);

export const NO_CALLS = i18n.translate('xpack.entityInventoryApp.performanceOverlay.noCalls', {
  defaultMessage: 'No requests recorded',
});

export const NO_LIST_SELECTED = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.noListSelected',
  {
    defaultMessage: 'No list request recorded',
  }
);

export const LIST_REQUEST = (type: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.listRequest', {
    defaultMessage: '{type} list',
    values: { type },
  });

export const ROUND_TRIP = (duration: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.roundTrip', {
    defaultMessage: '{duration} round trip',
    values: { duration },
  });

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
  request: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.request', {
    defaultMessage: 'Request',
  }),
  status: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.status', {
    defaultMessage: 'Status',
  }),
  browser: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.browser', {
    defaultMessage: 'Browser',
  }),
  server: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.server', {
    defaultMessage: 'Server',
  }),
  errors: i18n.translate('xpack.entityInventoryApp.performanceOverlay.history.errors', {
    defaultMessage: 'Errors',
  }),
} as const;

export const DURATION_MS = (value: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.unit.ms', {
    defaultMessage: '{value} ms',
    values: { value },
  });

export const SHARE = (value: number): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.unit.share', {
    defaultMessage: '{value}%',
    values: { value },
  });

export const COUNT_UNITS = {
  docs: (count: number, value: string): string =>
    i18n.translate('xpack.entityInventoryApp.performanceOverlay.unit.docs', {
      defaultMessage: '{count, plural, one {{value} doc} other {{value} docs}}',
      values: { count, value },
    }),
  values: (count: number, value: string): string =>
    i18n.translate('xpack.entityInventoryApp.performanceOverlay.unit.values', {
      defaultMessage: '{count, plural, one {{value} value} other {{value} values}}',
      values: { count, value },
    }),
  rows: (count: number, value: string): string =>
    i18n.translate('xpack.entityInventoryApp.performanceOverlay.unit.rows', {
      defaultMessage: '{count, plural, one {{value} row} other {{value} rows}}',
      values: { count, value },
    }),
} as const;

export const YES = i18n.translate('xpack.entityInventoryApp.performanceOverlay.yes', {
  defaultMessage: 'yes',
});
export const NO = i18n.translate('xpack.entityInventoryApp.performanceOverlay.no', {
  defaultMessage: 'no',
});

export const TRUNCATED = i18n.translate('xpack.entityInventoryApp.performanceOverlay.truncated', {
  defaultMessage: 'truncated',
});

export const SUMMARY_TITLES = {
  timings: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.timings', {
    defaultMessage: 'Breakdown',
  }),
  elasticsearch: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.summary.elasticsearch',
    {
      defaultMessage: 'Elasticsearch work',
    }
  ),
} as const;

export const TIMING_COLUMNS = {
  stage: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingColumn.stage', {
    defaultMessage: 'Stage',
  }),
  time: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingColumn.time', {
    defaultMessage: 'Time',
  }),
  share: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingColumn.share', {
    defaultMessage: 'Share',
  }),
  shareTooltip: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.timingColumn.shareTooltip',
    {
      defaultMessage: 'Share of the browser round trip',
    }
  ),
} as const;

export const TIMING_ROWS = {
  roundTrip: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.roundTrip', {
    defaultMessage: 'Total (browser)',
  }),
  network: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.network', {
    defaultMessage: 'Network and serialization',
  }),
  server: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.server', {
    defaultMessage: 'Server',
  }),
  definition: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.definition', {
    defaultMessage: 'Definition lookup',
  }),
  planning: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.planning', {
    defaultMessage: 'Planning',
  }),
  probes: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.probes', {
    defaultMessage: 'Probes',
  }),
  queryGeneration: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.timingRow.queryGeneration',
    {
      defaultMessage: 'Query generation',
    }
  ),
  queries: i18n.translate('xpack.entityInventoryApp.performanceOverlay.timingRow.queries', {
    defaultMessage: 'Queries (run in parallel)',
  }),
  mergeAndSort: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.timingRow.mergeAndSort',
    {
      defaultMessage: 'Merge and sort',
    }
  ),
} as const;

export const ELASTICSEARCH_COLUMNS = {
  metric: i18n.translate('xpack.entityInventoryApp.performanceOverlay.esColumn.metric', {
    defaultMessage: 'Metric',
  }),
  queries: i18n.translate('xpack.entityInventoryApp.performanceOverlay.esColumn.queries', {
    defaultMessage: 'Plan queries',
  }),
  probes: i18n.translate('xpack.entityInventoryApp.performanceOverlay.esColumn.probes', {
    defaultMessage: 'Probes',
  }),
} as const;

/** Labels of the Elasticsearch work summed over a call's plan queries or probes. */
export const SUMMARY_LABELS = {
  slowestQuery: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.slowestQuery', {
    defaultMessage: 'Slowest query',
  }),
  totalQueryTime: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.summary.totalQueryTime',
    {
      defaultMessage: 'Total query time',
    }
  ),
  cpu: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.cpu', {
    defaultMessage: 'Total CPU time',
  }),
  driver: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.driver', {
    defaultMessage: 'Total driver time',
  }),
  documents: i18n.translate('xpack.entityInventoryApp.performanceOverlay.summary.documents', {
    defaultMessage: 'Documents visited',
  }),
} as const;

/** Labels of Elasticsearch execution stats, shared by the summary, the tables and their expanded rows. */
export const STAT_LABELS = {
  esTime: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.esTime', {
    defaultMessage: 'ES time',
  }),
  cpu: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.cpuTime', {
    defaultMessage: 'CPU time',
  }),
  driver: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.driverTime', {
    defaultMessage: 'Driver time',
  }),
  documents: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.documents', {
    defaultMessage: 'Docs',
  }),
  values: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.valuesRead', {
    defaultMessage: 'Values read',
  }),
  rows: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.rows', {
    defaultMessage: 'Rows',
  }),
  bytes: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.bytesRead', {
    defaultMessage: 'Bytes read',
  }),
  shards: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.shards', {
    defaultMessage: 'Shards',
  }),
  partial: i18n.translate('xpack.entityInventoryApp.performanceOverlay.stat.partial', {
    defaultMessage: 'Partial',
  }),
} as const;

export const TABLE_COLUMNS = {
  indexPattern: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.indexPattern', {
    defaultMessage: 'Index pattern',
  }),
  engine: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.engine', {
    defaultMessage: 'Engine',
  }),
  plans: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.plans', {
    defaultMessage: 'Plans',
  }),
  status: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.status', {
    defaultMessage: 'Status',
  }),
  column: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.column', {
    defaultMessage: 'Column',
  }),
  field: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.field', {
    defaultMessage: 'Field',
  }),
  reason: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.reason', {
    defaultMessage: 'Reason',
  }),
  expand: i18n.translate('xpack.entityInventoryApp.performanceOverlay.column.expand', {
    defaultMessage: 'Details',
  }),
} as const;

export const SECTION_TITLES = {
  queries: i18n.translate('xpack.entityInventoryApp.performanceOverlay.section.queries', {
    defaultMessage: 'Queries',
  }),
  probes: i18n.translate('xpack.entityInventoryApp.performanceOverlay.section.probes', {
    defaultMessage: 'Probes',
  }),
  otherErrors: i18n.translate('xpack.entityInventoryApp.performanceOverlay.section.otherErrors', {
    defaultMessage: 'Other errors',
  }),
} as const;

export const ROW_ERROR_TITLE = (status: number | null): string =>
  status === null
    ? i18n.translate('xpack.entityInventoryApp.performanceOverlay.rowError.title', {
        defaultMessage: 'Error',
      })
    : i18n.translate('xpack.entityInventoryApp.performanceOverlay.rowError.titleWithStatus', {
        defaultMessage: 'Error {status}',
        values: { status },
      });

export const ROW_PARTIAL_TITLE = i18n.translate(
  'xpack.entityInventoryApp.performanceOverlay.rowPartial.title',
  {
    defaultMessage: 'Partial result: some shards or clusters did not answer',
  }
);

export const UNAVAILABLE_COLUMNS_TITLE = (count: number): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.unavailableColumnsTitle', {
    defaultMessage: 'Unavailable columns ({count})',
    values: { count },
  });

export const ROW_STATUS = {
  ok: i18n.translate('xpack.entityInventoryApp.performanceOverlay.rowStatus.ok', {
    defaultMessage: 'OK',
  }),
  partial: i18n.translate('xpack.entityInventoryApp.performanceOverlay.rowStatus.partial', {
    defaultMessage: 'Partial',
  }),
  error: i18n.translate('xpack.entityInventoryApp.performanceOverlay.rowStatus.error', {
    defaultMessage: 'Error',
  }),
} as const;

/** The plans a probe's outcome allows for its index pattern. */
export const PROBE_PLANS = {
  time_series: i18n.translate('xpack.entityInventoryApp.performanceOverlay.probePlans.timeSeries', {
    defaultMessage: 'TS + FROM',
  }),
  no_time_series: i18n.translate(
    'xpack.entityInventoryApp.performanceOverlay.probePlans.noTimeSeries',
    {
      defaultMessage: 'FROM only',
    }
  ),
  failed: i18n.translate('xpack.entityInventoryApp.performanceOverlay.probePlans.failed', {
    defaultMessage: 'None',
  }),
} as const;

export const EXPAND_ROW = (indexPattern: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.expandRow', {
    defaultMessage: 'Show details of {indexPattern}',
    values: { indexPattern },
  });

export const COLLAPSE_ROW = (indexPattern: string): string =>
  i18n.translate('xpack.entityInventoryApp.performanceOverlay.collapseRow', {
    defaultMessage: 'Hide details of {indexPattern}',
    values: { indexPattern },
  });

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
