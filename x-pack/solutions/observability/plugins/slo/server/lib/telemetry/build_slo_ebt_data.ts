/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { ALL_VALUE } from '@kbn/slo-schema';
import { isEqual, sortBy } from 'lodash';
import type { CompositeSLODefinition, SLODefinition } from '../../domain/models';
import type {
  CompositeSloChangedField,
  CompositeSloDefinitionEbtData,
  CompositeSloDeletedEbtData,
  SloChangedField,
  SloDefinitionEbtData,
} from './ebt_event_types';
import { COMPOSITE_SLO_CHANGED_FIELDS, SLO_CHANGED_FIELDS } from './ebt_event_types';

/** SLO ids can be caller-supplied descriptive strings, so only a stable hash of the id is reported. */
export const hashSloId = (sloId: string): string =>
  createHash('sha256').update(sloId).digest('hex');

/** Projects an SLO definition into the attributes reported by the SLO EBT events. */
export const toSloDefinitionEbtData = (slo: SLODefinition): SloDefinitionEbtData => ({
  slo_id: hashSloId(slo.id),
  indicator_type: slo.indicator.type,
  budgeting_method: slo.budgetingMethod,
  time_window_type: slo.timeWindow.type,
  grouped: [slo.groupBy].flat().some((field) => field !== ALL_VALUE),
});

/** Returns the user-editable SLO fields that differ between two definitions. */
export const getChangedFields = (
  original: SLODefinition,
  updated: SLODefinition
): SloChangedField[] =>
  SLO_CHANGED_FIELDS.filter((field) => !isEqual(original[field], updated[field]));

/** Projects a composite SLO id into the attributes reported by `composite_slo_deleted`. */
export const toCompositeSloDeletedEbtData = (
  compositeSloId: string
): CompositeSloDeletedEbtData => ({
  composite_slo_id: hashSloId(compositeSloId),
});

/** Projects a composite SLO definition into the attributes reported by the composite SLO EBT events. */
export const toCompositeSloDefinitionEbtData = (
  compositeSlo: CompositeSLODefinition
): CompositeSloDefinitionEbtData => ({
  ...toCompositeSloDeletedEbtData(compositeSlo.id),
  members_count: compositeSlo.members.length,
  members_with_instance_id_count: compositeSlo.members.filter(({ instanceId }) => !!instanceId)
    .length,
});

/** Members are unique by `sloId` + `instanceId`, so that pair gives a stable order-insensitive sort. */
const sortMembers = (members: CompositeSLODefinition['members']) =>
  sortBy(members, ({ sloId, instanceId }) => `${sloId}:${instanceId ?? ''}`);

/** Returns the user-editable composite SLO fields that differ between two definitions (member order is ignored). */
export const getCompositeChangedFields = (
  original: CompositeSLODefinition,
  updated: CompositeSLODefinition
): CompositeSloChangedField[] =>
  COMPOSITE_SLO_CHANGED_FIELDS.filter((field) =>
    field === 'members'
      ? !isEqual(sortMembers(original.members), sortMembers(updated.members))
      : !isEqual(original[field], updated[field])
  );
