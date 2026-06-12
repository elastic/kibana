/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import type { EcsFieldMetadata, PartitionedFieldMetadata, SortConfig } from './types';
import * as i18n from './translations';

export const EcsFlatTyped = EcsFlat as unknown as Record<string, EcsFieldMetadata>;
export type EcsFlatTyped = typeof EcsFlatTyped;

export const ilmPhaseOptionsStatic: EuiComboBoxOptionOption[] = [
  {
    label: i18n.HOT,
    value: 'hot',
  },
  {
    label: i18n.WARM,
    value: 'warm',
  },
  {
    disabled: true,
    label: i18n.COLD,
    value: 'cold',
  },
  {
    disabled: true,
    label: i18n.FROZEN,
    value: 'frozen',
  },
  {
    label: i18n.UNMANAGED,
    value: 'unmanaged',
  },
];

export const EMPTY_STAT = '--';

export const INTERNAL_API_VERSION = '1';

export const defaultSort: SortConfig = {
  sort: {
    direction: 'desc',
    field: 'docsCount',
  },
};

export const EMPTY_METADATA: PartitionedFieldMetadata = {
  all: [],
  ecsCompliant: [],
  custom: [],
  incompatible: [],
  sameFamily: [],
};

export const EMPTY_PLACEHOLDER = '--';

export const ECS_FIELD_REFERENCE_URL =
  'https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html';

/** The documentation link shown in the `Data Quality` dashboard */
export const ECS_REFERENCE_URL = 'https://www.elastic.co/guide/en/ecs/current/ecs-reference.html';
export const MAPPING_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html';
