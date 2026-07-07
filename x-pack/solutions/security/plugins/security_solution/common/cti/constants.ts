/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_DESTINATION_PATH, DEFAULT_INDICATOR_SOURCE_PATH } from '../constants';

export const MATCHED_ATOMIC = 'matched.atomic';
export const MATCHED_FIELD = 'matched.field';
export const MATCHED_ID = 'matched.id';
export const MATCHED_TYPE = 'matched.type';
export const INDICATOR_MATCH_SUBFIELDS = [MATCHED_ATOMIC, MATCHED_FIELD, MATCHED_TYPE];

export const INDICATOR_MATCHED_FIELD = `${ENRICHMENT_DESTINATION_PATH}.${MATCHED_FIELD}`;
export const INDICATOR_MATCHED_TYPE = `${ENRICHMENT_DESTINATION_PATH}.${MATCHED_TYPE}`;

export const EVENT_DATASET = 'event.dataset';

export const FIRST_SEEN = 'indicator.first_seen';
export const LAST_SEEN = 'indicator.last_seen';
export const REFERENCE = 'indicator.reference';
export const FEED_NAME = 'feed.name';

export const FEED_NAME_PATH = `threat.${FEED_NAME}`;

export const INDICATOR_REFERENCE = `${ENRICHMENT_DESTINATION_PATH}.${REFERENCE}`;

export enum ENRICHMENT_TYPES {
  InvestigationTime = 'investigation_time',
  IndicatorMatchRule = 'indicator_match_rule',
}

export const EVENT_ENRICHMENT_INDICATOR_FIELD_MAP = {
  'file.hash.md5': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.hash.md5`,
  'file.hash.sha1': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.hash.sha1`,
  'file.hash.sha256': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.hash.sha256`,
  'file.pe.imphash': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.pe.imphash`,
  'file.elf.telfhash': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.elf.telfhash`,
  'file.hash.ssdeep': `${DEFAULT_INDICATOR_SOURCE_PATH}.file.hash.ssdeep`,
  'source.ip': `${DEFAULT_INDICATOR_SOURCE_PATH}.ip`,
  'destination.ip': `${DEFAULT_INDICATOR_SOURCE_PATH}.ip`,
  'url.full': `${DEFAULT_INDICATOR_SOURCE_PATH}.url.full`,
  'registry.path': `${DEFAULT_INDICATOR_SOURCE_PATH}.registry.path`,
};

export const DEFAULT_EVENT_ENRICHMENT_FROM = 'now-30d';
export const DEFAULT_EVENT_ENRICHMENT_TO = 'now';

export const OTHER_TI_DATASET_KEY = '_others_ti_';

export const THREAT_PIT_KEEP_ALIVE = '5m';
