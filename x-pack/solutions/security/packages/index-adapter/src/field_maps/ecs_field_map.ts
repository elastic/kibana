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
import type { EcsMetadata, FieldMap } from './types';

const EXCLUDED_TYPES = ['constant_keyword'];

// ECS fields that have reached Stage 2 in the RFC process
// are included in the generated Yaml but are still considered
// experimental. Some are correctly marked as beta but most are
// not.

// More about the RFC stages here: https://elastic.github.io/ecs/stages.html

// The following RFCS are currently in stage 2:
// https://github.com/elastic/ecs/blob/main/rfcs/text/0027-faas-fields.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0035-tty-output.md
// https://github.com/elastic/ecs/blob/main/rfcs/text/0037-host-metrics.md

// Fields from these RFCs that are not already in the ECS component template
// as of 8.11 are manually identified as experimental below.
// The next time this list is updated, we should check the above list of RFCs to
// see if any have moved to Stage 3 and remove them from the list and check if
// there are any new stage 2 RFCs with fields we should exclude as experimental.

const EXPERIMENTAL_FIELDS = [
  'faas.trigger', // this was previously mapped as nested but changed to object
  'faas.trigger.request_id',
  'faas.trigger.type',
  'host.cpu.system.norm.pct',
  'host.cpu.user.norm.pct',
  'host.fsstats.total_size.total',
  'host.fsstats.total_size.used',
  'host.fsstats.total_size.used.pct',
  'host.load.norm.1',
  'host.load.norm.5',
  'host.load.norm.15',
  'host.memory.actual.used.bytes',
  'host.memory.actual.used.pct',
  'host.memory.total',
  'process.io.bytes',
];

export const ecsFieldMap: FieldMap = Object.fromEntries(
  Object.entries(EcsFlat)
    .filter(
      ([key, value]) => !EXCLUDED_TYPES.includes(value.type) && !EXPERIMENTAL_FIELDS.includes(key)
    )
    .map(([key, _]) => {
      const value: EcsMetadata = EcsFlat[key as keyof typeof EcsFlat];
      return [
        key,
        {
          type: value.type,
          array: value.normalize.includes('array'),
          required: !!value.required,
          ...(value.scaling_factor ? { scaling_factor: value.scaling_factor } : {}),
          ...(value.ignore_above ? { ignore_above: value.ignore_above } : {}),
          ...(value.multi_fields ? { multi_fields: value.multi_fields } : {}),
        },
      ];
    })
);

export type EcsFieldMap = typeof ecsFieldMap;
