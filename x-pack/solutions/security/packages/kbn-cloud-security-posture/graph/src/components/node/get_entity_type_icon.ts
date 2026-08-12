/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ENTITY_TYPE_ICON_MAP: Record<string, string> = {
  host: 'storage',
  user: 'user',
  'Other - Application': 'grid',
  'Other - Cloud Services & Management': 'cloud',
  'Other - Communication Services': 'comment',
  'Other - Code & Software Lifecycle': 'code',
  'Other - Container': 'package',
  'Other - Credentials': 'key',
  'Other - Governance & Security': 'lock',
  'Other - Kubernetes Cluster / Orchestration': 'kubernetesPod',
  'Other - Network & Connectivity': 'globe',
  'Other - Storage & Data Management': 'database',
  'No Type': 'questionInCircle',
};

export const getEntityTypeIcon = (entityType?: string): string => {
  if (!entityType) return 'questionInCircle';
  return ENTITY_TYPE_ICON_MAP[entityType] ?? 'questionInCircle';
};
