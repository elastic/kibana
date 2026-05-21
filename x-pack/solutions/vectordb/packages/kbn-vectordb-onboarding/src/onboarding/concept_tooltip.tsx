/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const CONCEPTS = {
  dense_vector: i18n.translate('vectordbOnboarding.concept.denseVector', {
    defaultMessage:
      'A field that stores a fixed-length array of floats — your precomputed embedding.',
  }),
  semantic_text: i18n.translate('vectordbOnboarding.concept.semanticText', {
    defaultMessage:
      'A field that takes plain text and lets Elasticsearch generate and store the embedding for you.',
  }),
  knn: i18n.translate('vectordbOnboarding.concept.knn', {
    defaultMessage:
      'k-Nearest-Neighbor search: returns the k vectors closest to your query vector.',
  }),
  similarity: i18n.translate('vectordbOnboarding.concept.similarity', {
    defaultMessage:
      'How "close" two vectors are. Cosine works for most embedding models. Match this to your model.',
  }),
  quantization: i18n.translate('vectordbOnboarding.concept.quantization', {
    defaultMessage:
      'Compresses each vector (e.g. float32 → int8 or 1-bit) to cut memory and disk use. Defaults to int8 — a good fit for most workloads.',
  }),
  num_candidates: i18n.translate('vectordbOnboarding.concept.numCandidates', {
    defaultMessage:
      'How many candidate vectors each shard considers before returning the top k. Higher = more accurate, slower.',
  }),
} as const;

export type ConceptKey = keyof typeof CONCEPTS;

interface ConceptTooltipProps {
  concept: ConceptKey;
}

export const ConceptTooltip: React.FC<ConceptTooltipProps> = ({ concept }) => (
  <EuiIconTip
    type="question"
    color="subdued"
    content={CONCEPTS[concept]}
    aria-label={concept}
    position="top"
  />
);
