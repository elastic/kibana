/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveRoadmapForEpic } from './roadmap_mapping';
import {
  getDeckFeatureForGithubEpicKey,
  isWorkflowsGithubEpicKey,
  WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
} from './workflows_deck_epic_correlation';

describe('workflows_deck_epic_correlation', () => {
  it('maps deck Workflow Versioning to the GitHub epic row title on project 705', () => {
    const correlation = getDeckFeatureForGithubEpicKey('[Epic] Workflow Versioning');
    expect(correlation?.deckFeature).toBe('Workflow Versioning');
    expect(correlation?.deckBucket).toBe('next');
  });

  it('recognizes One Workflow epics on project 705', () => {
    expect(
      isWorkflowsGithubEpicKey({
        epicKey: '[One Workflow] G.A. readiness for Kibana 9.4',
        projectNumber: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
      })
    ).toBe(true);
    expect(
      isWorkflowsGithubEpicKey({
        epicKey: 'Automation - CDR workflows',
        projectNumber: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
      })
    ).toBe(false);
  });

  it('assigns workflows roadmap from epic key without Product Initiative', () => {
    expect(
      resolveRoadmapForEpic({
        epicKey: '[Epic] Event-Driven Triggers GA',
        projectNumber: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
      })
    ).toMatchObject({ id: 'workflows' });
  });
});
