/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';
import {
  InferredKnowledgeIndicatorBadge,
  hasKnowledgeIndicatorProvenance,
} from './inferred_knowledge_indicator_badge';
import { GRAPH_INFERRED_KI_BADGE_ID } from '../test_ids';

const doc = (overrides: Partial<NodeDocumentDataModel> = {}): NodeDocumentDataModel =>
  ({ id: 'doc-1', type: 'event', ...overrides } as NodeDocumentDataModel);

describe('hasKnowledgeIndicatorProvenance', () => {
  it('is false for undefined / empty / non-array input', () => {
    expect(hasKnowledgeIndicatorProvenance(undefined)).toBe(false);
    expect(hasKnowledgeIndicatorProvenance([])).toBe(false);
    expect(hasKnowledgeIndicatorProvenance({} as unknown as NodeDocumentDataModel[])).toBe(false);
  });

  it('is false when no document carries knowledge_indicator provenance', () => {
    expect(hasKnowledgeIndicatorProvenance([doc(), doc({ id: 'doc-2' })])).toBe(false);
  });

  it('is true when at least one document carries a feature_uuid', () => {
    expect(
      hasKnowledgeIndicatorProvenance([
        doc(),
        doc({
          id: 'doc-2',
          knowledge_indicator: { feature_uuid: 'azure-feature-1', confidence: 88 },
        }),
      ])
    ).toBe(true);
  });

  it('is false when knowledge_indicator is present but feature_uuid is missing', () => {
    expect(
      hasKnowledgeIndicatorProvenance([doc({ knowledge_indicator: { confidence: 88 } })])
    ).toBe(false);
  });
});

describe('InferredKnowledgeIndicatorBadge', () => {
  it('renders the badge with the default label', () => {
    render(<InferredKnowledgeIndicatorBadge />);
    const badge = screen.getByTestId(GRAPH_INFERRED_KI_BADGE_ID);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Inferred (KI)');
  });
});
