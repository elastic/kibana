/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CoverageLevel = 'good' | 'amber' | 'risk';

export const getCoverageLevel = (coveragePct: number): CoverageLevel => {
  if (coveragePct >= 70) {
    return 'good';
  }
  if (coveragePct >= 30) {
    return 'amber';
  }
  return 'risk';
};

export const getOwnerInitials = (owner?: string): string => {
  if (!owner?.trim()) {
    return '?';
  }

  return owner
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
};

export const getDeckBucketLabel = (deckBucket?: string, milestone?: string): string | undefined => {
  if (deckBucket === 'released_9_3') {
    return `Released (${milestone ?? '9.3'})`;
  }
  if (deckBucket === 'now') {
    return 'Now';
  }
  if (deckBucket === 'next') {
    return 'Next';
  }
  if (deckBucket === 'later') {
    return 'Later';
  }

  return undefined;
};

export const getEpicStatusLabel = (status: string): string => {
  if (status === 'closed') {
    return 'Done';
  }
  if (status === 'in-progress') {
    return 'Active';
  }
  return 'Planned';
};

export const getTicketStatusLabel = (status: string): string => {
  if (status === 'closed') {
    return 'Closed';
  }
  if (status === 'in-progress') {
    return 'In progress';
  }
  return 'Open';
};
