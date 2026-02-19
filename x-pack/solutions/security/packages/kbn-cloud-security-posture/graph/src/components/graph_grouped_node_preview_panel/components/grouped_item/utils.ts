/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type {
  EventItem,
  AlertItem,
} from '@kbn/cloud-security-posture-common/types/graph_events/v1';

export const displayEventName = ({ action, id }: Pick<EventItem | AlertItem, 'action' | 'id'>) =>
  action || id || '-';

export const displayEntityName = ({ name, id }: Pick<EntityItem, 'name' | 'id'>) =>
  name || id || '-';
