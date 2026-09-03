/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractDiamondExample } from '../types';
import { AWS_IAM_PACK, KUBERNETES_PACK, OKTA_PACK } from './packs';

/**
 * Diamond extraction is exercised on the three packs richest in adversary,
 * capability, infrastructure, and victim signal. `min_signal_count` is a floor
 * on how many of the four vertices should come back non-NONE; the prose-quality
 * and IOC-leak constraints are checked by the LLM-judge criteria in the spec.
 *
 * The GitHub pack is intentionally excluded: it is an optional-hunting rollup
 * that `enrich_taxonomy` gates as not `diamond_suitable`, so the pipeline would
 * not send it to extraction.
 */
export const extractDiamondDataset: ExtractDiamondExample[] = [
  {
    input: { text: OKTA_PACK.body, report_id: `pack-${OKTA_PACK.packId}` },
    output: { min_signal_count: 3 },
    metadata: {
      Title: 'extract_diamond: okta identity campaign',
      source: 'fixture-derived',
      pack: OKTA_PACK.packId,
    },
  },
  {
    input: { text: AWS_IAM_PACK.body, report_id: `pack-${AWS_IAM_PACK.packId}` },
    output: { min_signal_count: 3 },
    metadata: {
      Title: 'extract_diamond: aws-iam privilege escalation',
      source: 'fixture-derived',
      pack: AWS_IAM_PACK.packId,
    },
  },
  {
    input: { text: KUBERNETES_PACK.body, report_id: `pack-${KUBERNETES_PACK.packId}` },
    output: { min_signal_count: 2 },
    metadata: {
      Title: 'extract_diamond: kubernetes secret theft',
      source: 'fixture-derived',
      pack: KUBERNETES_PACK.packId,
    },
  },
];
