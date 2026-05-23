/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { ResolutionProvenanceBadge } from './resolution_provenance_badge';
import {
  RESOLUTION_PROVENANCE_BADGE_TEST_ID,
  RESOLUTION_DIVERGENCE_BADGE_TEST_ID,
} from './test_ids';

const buildEntity = (
  fields: Partial<{
    resolvedBy: string;
    score: number;
    modelId: string;
  }>
): Record<string, unknown> => {
  const entity: Record<string, unknown> = {
    'entity.id': 'entity-1',
    'entity.name': 'alice',
  };
  if (fields.resolvedBy !== undefined) {
    entity['entity.relationships.resolution.resolved_by'] = fields.resolvedBy;
  }
  if (fields.score !== undefined) {
    entity['entity.relationships.resolution.score'] = fields.score;
  }
  if (fields.modelId !== undefined) {
    entity['entity.relationships.resolution.model_id'] = fields.modelId;
  }
  return entity;
};

describe('ResolutionProvenanceBadge', () => {
  it('renders the rule label without a score', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionProvenanceBadge entity={buildEntity({ resolvedBy: 'rule' })} />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent('Rule');
  });

  it('renders the embedding label with a rounded percent score', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionProvenanceBadge
          entity={buildEntity({
            resolvedBy: 'embedding',
            score: 0.913,
            modelId: '.jina-embeddings-v5-text-small',
          })}
        />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent('Embedding 91%');
  });

  it('renders the embedding+rerank label when source is the compound rerank value', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionProvenanceBadge
          entity={buildEntity({ resolvedBy: 'embedding+rerank', score: 0.945 })}
        />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent(
      'Embedding+rerank 95%'
    );
  });

  it('returns null when the entity has no resolved_by field (target row / legacy data)', () => {
    const { container } = render(
      <TestProviders>
        <ResolutionProvenanceBadge entity={buildEntity({})} />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the embedding label without a percent suffix when no score is present', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionProvenanceBadge entity={buildEntity({ resolvedBy: 'embedding' })} />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent(/^Embedding$/);
  });

  it('falls back to the raw source string for unknown future values (FE older than BE)', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResolutionProvenanceBadge
          entity={buildEntity({ resolvedBy: 'embedding+something-new', score: 0.8 })}
        />
      </TestProviders>
    );

    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent(
      'embedding+something-new'
    );
  });

  describe('parallel resolution divergence', () => {
    const buildDivergentEntity = ({
      ruleTo,
      embeddingTo,
      embeddingScore,
    }: {
      ruleTo?: string;
      embeddingTo?: string;
      embeddingScore?: number;
    }): Record<string, unknown> => {
      const entity: Record<string, unknown> = {
        'entity.id': 'entity-1',
        'entity.relationships.resolution.resolved_by': 'rule',
        'entity.relationships.resolution.divergent': true,
      };
      if (ruleTo) entity['entity.relationships.resolution.by_rule.resolved_to'] = ruleTo;
      if (embeddingTo) {
        entity['entity.relationships.resolution.by_embedding.resolved_to'] = embeddingTo;
      }
      if (embeddingScore !== undefined) {
        entity['entity.relationships.resolution.by_embedding.score'] = embeddingScore;
      }
      return entity;
    };

    it('renders the divergence badge instead of the per-source badge when divergent is true', () => {
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <ResolutionProvenanceBadge
            entity={buildDivergentEntity({
              ruleTo: 'er-rule-target',
              embeddingTo: 'er-embed-target',
              embeddingScore: 0.91,
            })}
          />
        </TestProviders>
      );

      expect(getByTestId(RESOLUTION_DIVERGENCE_BADGE_TEST_ID)).toHaveTextContent('Diverges');
      expect(queryByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toBeNull();
    });

    it('falls back to the per-source badge when divergent is false even if the by_* slots are populated', () => {
      const entity: Record<string, unknown> = {
        'entity.id': 'entity-1',
        'entity.relationships.resolution.resolved_by': 'rule',
        'entity.relationships.resolution.divergent': false,
        'entity.relationships.resolution.by_rule.resolved_to': 'er-target',
        'entity.relationships.resolution.by_embedding.resolved_to': 'er-target',
      };
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <ResolutionProvenanceBadge entity={entity} />
        </TestProviders>
      );

      expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent('Rule');
      expect(queryByTestId(RESOLUTION_DIVERGENCE_BADGE_TEST_ID)).toBeNull();
    });
  });

  it('clamps out-of-range scores to [0%, 100%] when formatting the percent', () => {
    const { getByTestId, rerender } = render(
      <TestProviders>
        <ResolutionProvenanceBadge entity={buildEntity({ resolvedBy: 'embedding', score: 1.4 })} />
      </TestProviders>
    );
    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent('Embedding 100%');

    rerender(
      <TestProviders>
        <ResolutionProvenanceBadge entity={buildEntity({ resolvedBy: 'embedding', score: -0.2 })} />
      </TestProviders>
    );
    expect(getByTestId(RESOLUTION_PROVENANCE_BADGE_TEST_ID)).toHaveTextContent('Embedding 0%');
  });
});
