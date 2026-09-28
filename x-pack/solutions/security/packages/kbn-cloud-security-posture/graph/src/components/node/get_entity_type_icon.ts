/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Figma Entity Icons (Graph viz Component Library — node 14929:6541):
 * Host → storage, User → user, Other-* → grid/cloud/comment/code/package/key/lock/
 * kubernetesPod/globe/database, No Type → question.
 */
const ENTITY_TYPE_ICON_MAP: Record<string, string> = {
  host: 'storage',
  Host: 'storage',
  user: 'user',
  User: 'user',
  service: 'package',
  Service: 'package',
  'Other - Application': 'grid',
  'Other - Cloud Services & Management': 'cloud',
  'Other - Communication Services': 'comment',
  'Other - Code & Software Lifecycle': 'code',
  'Other - Code & Software Liftcycle': 'code',
  'Other - Container': 'package',
  'Other - Credentials': 'key',
  'Ohter - Credentials': 'key',
  'Other - Governance & Security': 'lock',
  'Other - Kubernetes Cluster / Orchestration': 'kubernetesPod',
  'Other - Network & Connectivity': 'globe',
  'Other - Storage & Data Management': 'database',
  'No Type': 'questionInCircle',
};

export const getEntityTypeIcon = (entityType?: string): string => {
  if (!entityType) return 'questionInCircle';
  const trimmed = entityType.trim();
  if (ENTITY_TYPE_ICON_MAP[trimmed]) {
    return ENTITY_TYPE_ICON_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (ENTITY_TYPE_ICON_MAP[lower]) {
    return ENTITY_TYPE_ICON_MAP[lower];
  }
  return 'questionInCircle';
};
