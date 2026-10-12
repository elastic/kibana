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
import { ExposureColumn } from './exposure_column';
import { StorylineDiagram } from './storyline_diagram/storyline_diagram';

interface BoundaryProps {
  storyline: Storyline;
  snapshot: BriefSnapshot;
  children: React.ReactNode;
}

/** Keeps a diagram render error local; falls back to the plain exposure list. */
class DiagramBoundary extends React.Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const { storyline, snapshot } = this.props;
    return (
      <div data-test-subj="executiveBriefSectionError">
        <EuiText size="s" color="subdued">
          <p>{'Graph unavailable'}</p>
        </EuiText>
        <ExposureColumn storyline={storyline} snapshot={snapshot} />
      </div>
    );
  }
}

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
    <DiagramBoundary storyline={storyline} snapshot={snapshot}>
      <StorylineDiagram storyline={storyline} snapshot={snapshot} />
    </DiagramBoundary>
  );
};
