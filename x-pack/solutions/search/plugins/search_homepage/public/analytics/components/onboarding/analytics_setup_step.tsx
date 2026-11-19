/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import type { AnalyticsEventSource, AnalyticsLinks } from '../../types';
import { ExplorePanel } from '../shared/explore_panel';
import { DashboardStep } from './dashboard_step';

interface AnalyticsSetupStepProps {
  stepId: 'explore' | 'dashboard';
  /** Event sources only, largest first. */
  sources: readonly AnalyticsEventSource[];
  totalSources: number;
  selectedSource: AnalyticsEventSource | undefined;
  onSelectSource: (name: string) => void;
  links: AnalyticsLinks;
  generation: SourceGenerationResult;
}

/** The steps that follow ingest for event data: ask a first question, then build a dashboard. */
export const AnalyticsSetupStep = ({
  stepId,
  sources,
  totalSources,
  selectedSource,
  onSelectSource,
  links,
  generation,
}: AnalyticsSetupStepProps): React.JSX.Element =>
  stepId === 'explore' ? (
    <ExplorePanel
      page="onboarding"
      headingElement="h3"
      sources={sources}
      totalSources={totalSources}
      selectedSource={selectedSource}
      onSelectSource={onSelectSource}
      showAgentEntry={false}
      links={links}
      generation={generation}
    />
  ) : (
    <DashboardStep links={links} source={selectedSource} generation={generation} />
  );
