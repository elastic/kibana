/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGraphActorEuidSourceFields,
  getGraphTargetEuidSourceFields,
} from '@kbn/cloud-security-posture-common/constants';

export { type EuidSourceFields } from '@kbn/cloud-security-posture-common/constants';
import { euid } from '@kbn/entity-store/common/euid_helpers';

export const GRAPH_ACTOR_EUID_SOURCE_FIELDS = getGraphActorEuidSourceFields(euid);
export const GRAPH_TARGET_EUID_SOURCE_FIELDS = getGraphTargetEuidSourceFields(euid);
