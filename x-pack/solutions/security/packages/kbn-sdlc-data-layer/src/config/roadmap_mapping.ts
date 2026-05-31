/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export interface RoadmapMappingEntry {
  readonly id: string;
  readonly product: string;
  readonly title: string;
}

export const PRODUCT_INITIATIVE_ROADMAP_MAP: Readonly<Record<string, RoadmapMappingEntry>> = {
  'Introduce Workflow Automation': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
  'Democratize Workflow Authoring': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
  'Support Production Scale': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
  'Enable SOAR Outcomes': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
  'Enable AIOps Outcomes': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
  'Enable Intelligent Workflow Automation': {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'Development lifecycle visibility platform',
  },
};

export const VIEW_ROADMAP_MAP: Readonly<Record<number, RoadmapMappingEntry>> = {
  134: {
    id: 'dlvp',
    product: 'Sec AI Dev Accelerators',
    title: 'One Workflow product roadmap',
  },
};

export const resolveRoadmapFromInitiative = (
  initiative: string | undefined
): RoadmapMappingEntry | undefined => {
  if (!initiative) {
    return undefined;
  }
  return PRODUCT_INITIATIVE_ROADMAP_MAP[initiative];
};
