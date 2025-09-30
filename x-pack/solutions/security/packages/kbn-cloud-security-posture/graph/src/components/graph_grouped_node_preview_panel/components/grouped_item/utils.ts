/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityItem, EventItem, AlertItem } from './types';

export const displayEventName = ({ action, id }: Pick<EventItem | AlertItem, 'action' | 'id'>) =>
  action || id || '-';

export const displayEntityName = ({ label, id }: Pick<EntityItem, 'label' | 'id'>) =>
  label || id || '-';

export const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.flyout.groupedItem';
