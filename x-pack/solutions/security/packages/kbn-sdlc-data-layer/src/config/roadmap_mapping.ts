/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWorkflowsGithubEpicKey } from './workflows_deck_epic_correlation';

export interface RoadmapMappingEntry {
  readonly id: string;
  readonly product: string;
  readonly title: string;
}

/** Product roadmap from Elastic Workflows (Automation) deck — pipeline / executive grouping. */
export const ELASTIC_WORKFLOWS_ROADMAP: RoadmapMappingEntry = {
  id: 'workflows',
  product: 'Elastic Workflows',
  title: 'Elastic Workflows (Automation) Roadmap',
};

/** SDLC intelligence platform engineering (separate from customer-facing Workflows product). */
export const SDLC_VISIBILITY_ROADMAP: RoadmapMappingEntry = {
  id: 'dlvp',
  product: 'Sec AI Dev Accelerators',
  title: 'Development lifecycle visibility platform',
};

/** Epics without a mapped product initiative roll up under this label (not per-epic titles). */
export const UNMAPPED_ROADMAP_GROUP_TITLE = 'Other initiatives';

/** Product roadmaps shown in pipeline / executive product filters (not GitHub epic titles). */
export const CANONICAL_PRODUCT_ROADMAPS: readonly RoadmapMappingEntry[] = [
  ELASTIC_WORKFLOWS_ROADMAP,
  SDLC_VISIBILITY_ROADMAP,
];

const mapWorkflowInitiatives = (
  entries: readonly string[]
): Readonly<Record<string, RoadmapMappingEntry>> =>
  Object.fromEntries(entries.map((initiative) => [initiative, ELASTIC_WORKFLOWS_ROADMAP]));

/** GitHub Projects "Product Initiative" values and roadmap feature titles from the Workflows deck. */
export const PRODUCT_INITIATIVE_ROADMAP_MAP: Readonly<Record<string, RoadmapMappingEntry>> = {
  ...mapWorkflowInitiatives([
    'Introduce Workflow Automation',
    'Democratize Workflow Authoring',
    'Support Production Scale',
    'Enable SOAR Outcomes',
    'Enable AIOps Outcomes',
    'Enable Intelligent Workflow Automation',
    'Workflow Engine',
    'Workflow Authoring',
    'Workflow Management',
    'Core Workflow Triggers',
    'Core Workflow Steps',
    'External Action Steps',
    'Workflows as Tools & AI Agents as Steps',
    'Event-Driven Triggers',
    'Workflow Composition',
    'Execution Safety',
    'AI Steps',
    'Data Transformation',
    'Expand Connector Library',
    'Workflow Debugging',
    'Workflow Versioning',
    'Human-in-the-Loop (HIL) Support',
    'Workflow Library',
    'Visual Workflow Builder & NL Authoring',
    'Execution View & Analytics',
    'System Workflows',
    'Workflows-as-Code',
    'Workflow Recommendation',
    'Workflow Migration',
  ]),
};

export const VIEW_ROADMAP_MAP: Readonly<Record<number, RoadmapMappingEntry>> = {
  134: ELASTIC_WORKFLOWS_ROADMAP,
};

export const resolveRoadmapFromInitiative = (
  initiative: string | undefined
): RoadmapMappingEntry | undefined => {
  if (!initiative) {
    return undefined;
  }
  return PRODUCT_INITIATIVE_ROADMAP_MAP[initiative];
};

export const resolveRoadmapForEpic = ({
  epicKey,
  initiative,
  projectNumber,
}: {
  epicKey?: string;
  initiative?: string;
  projectNumber?: number;
}): RoadmapMappingEntry | undefined => {
  if (epicKey && isWorkflowsGithubEpicKey({ epicKey, projectNumber })) {
    return ELASTIC_WORKFLOWS_ROADMAP;
  }

  return resolveRoadmapFromInitiative(initiative);
};
