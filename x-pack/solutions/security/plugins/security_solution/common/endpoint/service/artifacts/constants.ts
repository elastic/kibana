/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryMatch } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { EVENT_FILTERS_OPERATORS } from '@kbn/securitysolution-list-utils';

export const BY_POLICY_ARTIFACT_TAG_PREFIX = 'policy:';

export const GLOBAL_ARTIFACT_TAG = `${BY_POLICY_ARTIFACT_TAG_PREFIX}all`;

export const FILTER_PROCESS_DESCENDANTS_TAG = 'filter_process_descendants';

export const PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY: EntryMatch = Object.freeze({
  field: 'event.category',
  operator: 'included',
  type: 'match',
  value: 'process',
});

export const PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY_TEXT: string = `${
  PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY.field
} ${
  EVENT_FILTERS_OPERATORS.find(
    ({ type }) => type === PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY.type
  )?.message
} ${PROCESS_DESCENDANT_EVENT_FILTER_EXTRA_ENTRY.value}`;

// TODO: refact all uses of `ALL_ENDPOINT_ARTIFACTS_LIST_IDS to sue new const from shared package
export const ALL_ENDPOINT_ARTIFACT_LIST_IDS = ENDPOINT_ARTIFACT_LIST_IDS;

export const DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  `entries.value`,
  `entries.entries.value`,
  `item_id`,
];
