/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_VISIBLE_TAGS = 3;

export const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'desktop';
    case 'service':
      return 'gear';
    default:
      return 'questionInCircle';
  }
};
