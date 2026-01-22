/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAiNavigationTree } from './ai_navigation_tree';

describe('createAiNavigationTree', () => {
  it('returns the Workflows link between Agents and Value report when enabled', () => {
    const navigationTree = createAiNavigationTree('agent', true);

    const primaryNavSection = navigationTree.body[4];
    const children = 'children' in primaryNavSection ? primaryNavSection.children : [];

    const workflowsIndex = children.findIndex((item) => 'link' in item && item.link === 'workflows');
    const agentsIndex = children.findIndex((item) => 'link' in item && item.link === 'agent_builder');

    expect(workflowsIndex).toBe(agentsIndex + 1);
  });

  it('does not include the Workflows link when disabled', () => {
    const navigationTree = createAiNavigationTree('agent', false);

    const primaryNavSection = navigationTree.body[4];
    const children = 'children' in primaryNavSection ? primaryNavSection.children : [];

    const workflowsIndex = children.findIndex((item) => 'link' in item && item.link === 'workflows');

    expect(workflowsIndex).toBe(-1);
  });
});

