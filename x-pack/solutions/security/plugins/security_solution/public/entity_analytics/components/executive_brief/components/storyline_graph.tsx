/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import type {
  BriefSnapshot,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useHasGraphVisualizationLicense } from '../../../../common/hooks/use_has_graph_visualization_license';
import { SectionErrorBoundary } from './section_error_boundary';
import { StorylineDiagram } from './storyline_diagram/storyline_diagram';

/**
 * Static relationship diagram of a storyline built from its computed edges. Gated like the graph
 * view it summarises.
 */
export const StorylineGraph: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => {
  const hasLicense = useHasGraphVisualizationLicense();

  if (!hasLicense) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="executiveBriefGraphUnavailable">
        <p>{'The relationship graph requires a Platinum license or higher.'}</p>
      </EuiText>
    );
  }

  return (
    <SectionErrorBoundary fallbackText="Graph unavailable">
      <StorylineDiagram storyline={storyline} snapshot={snapshot} />
    </SectionErrorBoundary>
  );
};
