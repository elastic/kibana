/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type {
  BriefSnapshot,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useHasGraphVisualizationLicense } from '../../../../common/hooks/use_has_graph_visualization_license';
import { GraphPreview } from '../../../../flyout_v2/shared/components/graph_preview';
import { SectionErrorBoundary } from './section_error_boundary';
import { buildStorylineGraph } from '../utils/build_storyline_graph';

/** Static (non-interactive) graph of a storyline built from its computed edges. */
export const StorylineGraph: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => {
  const hasLicense = useHasGraphVisualizationLicense();
  const data = useMemo(() => buildStorylineGraph(storyline, snapshot), [storyline, snapshot]);

  if (!hasLicense) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="executiveBriefGraphUnavailable">
        <p>{'The relationship graph requires a Platinum license or higher.'}</p>
      </EuiText>
    );
  }

  return (
    <SectionErrorBoundary fallbackText="Graph unavailable">
      <GraphPreview isLoading={false} isError={false} data={data} />
    </SectionErrorBoundary>
  );
};
