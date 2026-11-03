/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SOURCE_SESSION_ID_FIELD } from './source_fields';

export interface SessionsPartition {
  index: number;
  count: number;
}

const toHex = (slot: number) => slot.toString(16).padStart(2, '0');

/**
 * `session.id` range of one partition. EDOT Browser session ids are random lowercase UUIDs,
 * so splitting the first byte (256 slots) gives evenly sized, non-overlapping slices.
 */
export const partitionRange = ({
  index,
  count,
}: SessionsPartition): { gte?: string; lt?: string } => ({
  ...(index > 0 ? { gte: toHex(Math.round((index * 256) / count)) } : {}),
  ...(index < count - 1 ? { lt: toHex(Math.round(((index + 1) * 256) / count)) } : {}),
});

/** Source filter for one partition, or none when all sessions go to one transform. */
export const partitionFilters = (partition: SessionsPartition): QueryDslQueryContainer[] =>
  partition.count > 1 ? [{ range: { [SOURCE_SESSION_ID_FIELD]: partitionRange(partition) } }] : [];
