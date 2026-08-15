/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RUM_SESSIONS_VERSION = 2;
export const RUM_SESSIONS_TRANSFORM_ID = `ux-rum-sessions-${RUM_SESSIONS_VERSION}`;
export const RUM_SESSIONS_INDEX = `ux-rum-sessions-${RUM_SESSIONS_VERSION}`;
export const RUM_SESSIONS_INDEX_PATTERN = 'ux-rum-sessions-*';
export const RUM_SESSIONS_TEMPLATE_NAME = 'ux-rum-sessions';
export const RUM_SESSIONS_PIPELINE_NAME = 'ux-rum-sessions-dest';
export const RUM_NORMALIZE_PIPELINE_NAME = 'ux-rum-normalize';
export const RUM_CANONICAL_SESSION_ID_FIELD = 'resource.attributes.session.id';
export const RUM_CANONICAL_SERVICE_NAME_FIELD = 'resource.attributes.service.name';
export const RUM_CANONICAL_URL_PATH_GROUPED_FIELD = 'attributes.url.path.grouped';
export const RUM_SESSIONS_MANAGED_BY = 'ux';
export const RUM_SESSIONS_SYNC_DELAY = '5m';
export const RUM_SESSIONS_LAG_SLACK_SECONDS = 15 * 60;
export const RUM_SESSIONS_PARTITION_COUNT = 16;

const ES_TIME_VALUE = /^([1-9]\d*)([smh])$/;

export const isValidEsTimeValue = (value?: string): value is string =>
  Boolean(value && value.length <= 8 && ES_TIME_VALUE.test(value));

export const parseEsTimeValueSeconds = (value: string): number => {
  const match = ES_TIME_VALUE.exec(value);
  if (!match) {
    return 5 * 60;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 's') {
    return amount;
  }
  if (unit === 'm') {
    return amount * 60;
  }
  return amount * 3600;
};

export const rumSessionsLagWarnSeconds = (syncDelay = RUM_SESSIONS_SYNC_DELAY): number =>
  parseEsTimeValueSeconds(syncDelay) + RUM_SESSIONS_LAG_SLACK_SECONDS;

export const RUM_SESSIONS_LAG_WARN_SECONDS = rumSessionsLagWarnSeconds();

export type RumAnalyticsMode = 'index' | 'raw';

export type RumSessionsTransformState =
  | 'started'
  | 'indexing'
  | 'stopping'
  | 'stopped'
  | 'failed'
  | 'aborting'
  | 'unknown';

export interface RumRollupStatus {
  installed: boolean;
  state: RumSessionsTransformState;
  watermark: string | null;
  transformId: string;
  index: string;
}

export const emptyRumRollupStatus = (transformId: string, index: string): RumRollupStatus => ({
  installed: false,
  state: 'unknown',
  watermark: null,
  transformId,
  index,
});

export interface RumAnalyticsStatus {
  installed: boolean;
  state: RumSessionsTransformState;
  watermark: string | null;
  lagSeconds: number | null;
  transformId: string;
  index: string;
  syncDelay: string;
  pagesDaily?: RumRollupStatus;
  serviceDaily?: RumRollupStatus;
}

export const emptyRumAnalyticsStatus = (): RumAnalyticsStatus => ({
  installed: false,
  state: 'unknown',
  watermark: null,
  lagSeconds: null,
  transformId: RUM_SESSIONS_TRANSFORM_ID,
  index: RUM_SESSIONS_INDEX,
  syncDelay: RUM_SESSIONS_SYNC_DELAY,
});

export const isRumAnalyticsMode = (value: string | undefined): value is RumAnalyticsMode =>
  value === 'index' || value === 'raw';

/** Token used in event_sequence / page_sequence / click_sequence. */
export const normalizeSequenceToken = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^[#/]+/, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);

export const eventSequenceToken = (type: 'page' | 'activity', value: string): string =>
  `${type === 'page' ? 'p' : 'a'}:${normalizeSequenceToken(value)}`;

export const shouldQuerySessionIndex = ({
  installed,
  analyticsMode,
  watermark,
}: {
  installed: boolean;
  analyticsMode?: string;
  watermark?: string | null;
}): boolean => installed && analyticsMode !== 'raw' && Boolean(watermark);

export const parseIncludeRaw = (value: string | boolean | undefined): boolean =>
  value === true || value === 'true';

export type RumAnalyticsHealth = 'missing' | 'healthy' | 'recovering';

export const rumAnalyticsHealth = (status: RumAnalyticsStatus): RumAnalyticsHealth => {
  if (!status.installed) {
    return 'missing';
  }
  if (!status.watermark) {
    return 'recovering';
  }
  if (status.state === 'failed' || status.state === 'stopped' || status.state === 'aborting') {
    return 'recovering';
  }
  if (
    status.lagSeconds != null &&
    status.lagSeconds > rumSessionsLagWarnSeconds(status.syncDelay)
  ) {
    return 'recovering';
  }
  return 'healthy';
};
