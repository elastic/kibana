/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SliRetentionValue {
  enabled: boolean;
  periodDays: number;
}

export const needsSliRetentionConfirmation = ({
  stored,
  next,
}: {
  stored: SliRetentionValue;
  next: SliRetentionValue;
}): boolean => next.enabled && (!stored.enabled || next.periodDays < stored.periodDays);
