/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_VISIBLE_TAGS = 1;

export const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'storage';
    case 'service':
      return 'node';
    case 'generic':
    default:
      return 'globe';
  }
};
