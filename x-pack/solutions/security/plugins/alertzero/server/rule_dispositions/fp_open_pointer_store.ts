/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  FP_OPEN_POINTER_KI_TYPE,
  RULE_DISPOSITIONS_AI_INDEX_DEST,
  RULE_DISPOSITIONS_TAG,
  fpOpenPointerId,
} from './constants';

/**
 * Structured fields live under `attributes` so they inherit the AI index template's flattened
 * mapping. Flattened values can come back as strings, so every field here is a string.
 */
interface FpOpenPointerAttributes {
  rule_id: string;
  space_id: string;
  conversation_id: string;
  review_execution_id?: string;
  status: 'open';
}

interface FpOpenPointerSource {
  '@timestamp': string;
  id: string;
  type: typeof FP_OPEN_POINTER_KI_TYPE;
  title: string;
  tags: string[];
  attributes: FpOpenPointerAttributes;
  updated_at: string;
}

export interface FpOpenPointer {
  ruleId: string;
  /** The Investigation whose closure proposal later batches of the rule are added to. */
  conversationId: string;
  reviewExecutionId?: string;
  updatedAt: string;
}

/** A read pointer and the sequence numbers that let a later write replace exactly this version. */
export interface StoredFpOpenPointer {
  pointer: FpOpenPointer;
  seqNo: number;
  primaryTerm: number;
}

export type FpOpenPointerWriteResult = 'written' | 'conflict';

export interface FpOpenPointerStore {
  get: (ruleId: string) => Promise<StoredFpOpenPointer | undefined>;
  /**
   * Creates the pointer when `replaces` is omitted and replaces that exact version otherwise.
   * Returns `conflict` when another writer got there first, so the caller can re-read.
   */
  write: (
    pointer: Omit<FpOpenPointer, 'updatedAt'>,
    replaces?: Pick<StoredFpOpenPointer, 'seqNo' | 'primaryTerm'>
  ) => Promise<FpOpenPointerWriteResult>;
}

const isStatusError = (error: unknown, statusCode: number): boolean =>
  isResponseError(error) && error.statusCode === statusCode;

export const createFpOpenPointerStore = ({
  esClient,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  /** Aborts in-flight Elasticsearch requests when the calling step is cancelled. */
  signal?: AbortSignal;
}): FpOpenPointerStore => ({
  get: async (ruleId) => {
    try {
      const response = await esClient.get<FpOpenPointerSource>(
        { index: RULE_DISPOSITIONS_AI_INDEX_DEST, id: fpOpenPointerId(spaceId, ruleId) },
        { signal }
      );
      const source = response._source;
      if (
        !response.found ||
        !source?.attributes?.conversation_id ||
        response._seq_no === undefined ||
        response._primary_term === undefined
      ) {
        return undefined;
      }
      return {
        pointer: {
          ruleId,
          conversationId: source.attributes.conversation_id,
          reviewExecutionId: source.attributes.review_execution_id,
          updatedAt: source.updated_at,
        },
        seqNo: response._seq_no,
        primaryTerm: response._primary_term,
      };
    } catch (error) {
      // The index does not exist until the first pointer is written.
      if (isStatusError(error, 404)) {
        return undefined;
      }
      throw error;
    }
  },

  write: async ({ ruleId, conversationId, reviewExecutionId }, replaces) => {
    const id = fpOpenPointerId(spaceId, ruleId);
    const now = new Date().toISOString();
    const document: FpOpenPointerSource = {
      '@timestamp': now,
      id,
      type: FP_OPEN_POINTER_KI_TYPE,
      title: `Open false positive closure proposal for rule ${ruleId}`,
      tags: [RULE_DISPOSITIONS_TAG],
      attributes: {
        rule_id: ruleId,
        space_id: spaceId,
        conversation_id: conversationId,
        ...(reviewExecutionId ? { review_execution_id: reviewExecutionId } : {}),
        status: 'open',
      },
      updated_at: now,
    };

    try {
      await esClient.index(
        {
          index: RULE_DISPOSITIONS_AI_INDEX_DEST,
          id,
          document,
          ...(replaces
            ? { if_seq_no: replaces.seqNo, if_primary_term: replaces.primaryTerm }
            : { op_type: 'create' as const }),
        },
        { signal }
      );
      return 'written';
    } catch (error) {
      if (isStatusError(error, 409)) {
        return 'conflict';
      }
      throw error;
    }
  },
});
