/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
  ENTITY_ANALYTICS_UI_PATHS,
  RESOLUTION_UI_NAVIGATION_CONTENT,
} from './ui_navigation';

/**
 * Contract checks for the "redirect first" rules of the UI-guided navigation sections.
 *
 * Build 01a14b73 (entity-analytics-v2 UI-navigation datasets) had the redirect lose to the
 * model's defaults in almost every family: on "Upload this CSV of asset criticalities." agents
 * asked the user for the missing file instead of linking, on "Clear all entity data." they asked
 * for confirmation first, on the engine-status and risk-engine examples they answered from tool
 * data, and the resolution-flyout reply arrived without the `flyout=` deep-link.
 *
 * The per-intent calls and paths were already in the content and were not enough. What was
 * missing is the meta-rule: the redirect is the first action of the turn, a missing input does
 * not change the destination, and a confirmation prompt is not a substitute for the link. These
 * assertions pin those sentences, so deleting one goes red here instead of silently in an eval
 * run. They fail against the pre-fix skill text (see the PR description for the red run).
 */
const LINK_TOOL = 'security.build_redirect_url';

/** The section body that follows `heading`, up to the next `###` heading or the end of the content. */
const sectionOf = (content: string, heading: string): string => {
  const start = content.indexOf(heading);
  expect(start).toBeGreaterThan(-1);

  const rest = content.slice(start + heading.length);
  const next = rest.search(/\n### /);
  return next === -1 ? rest : rest.slice(0, next);
};

describe('UI-guided navigation content states the redirect-first contract', () => {
  it('makes the redirect the first action of the turn, before any clarification', () => {
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain(
      'The redirect is the first action of the turn'
    );
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toMatch(
      /\*\*before anything else in that turn\*\*/
    );
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain('before any clarifying question');
  });

  it('says a missing input does not change the destination', () => {
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain(
      'A missing input never changes the destination'
    );
  });

  it('says a confirmation prompt is not a substitute for the link', () => {
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain(
      'A confirmation prompt is not a substitute for the link'
    );
    // The clear-all / enable-disable case the eval exercises must be named explicitly.
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain('clear all entity data');
  });

  it('requires the link in every reply of the section', () => {
    expect(ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT).toContain(
      'Every reply in this section contains the link'
    );
  });
});

describe('each redirect intent section names the link tool and its destination', () => {
  const redirectSections = [
    {
      content: ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      heading: '### Entity Analytics — enable / disable & clear all data',
      path: ENTITY_ANALYTICS_UI_PATHS.settings,
    },
    {
      content: ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      heading: '### Risk engine — scoring configuration',
      path: ENTITY_ANALYTICS_UI_PATHS.riskScore,
    },
    {
      content: ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      heading: '### Asset criticality — bulk / CSV operations',
      path: ENTITY_ANALYTICS_UI_PATHS.assetCriticality,
    },
    {
      content: ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      heading: '### Entity store / engine status',
      path: ENTITY_ANALYTICS_UI_PATHS.status,
    },
    {
      content: RESOLUTION_UI_NAVIGATION_CONTENT,
      heading: '### Open the resolution flyout — fallback, not a first choice',
      path: ENTITY_ANALYTICS_UI_PATHS.entityResolutionHomePage,
    },
    {
      content: RESOLUTION_UI_NAVIGATION_CONTENT,
      heading: '### Bulk / CSV import — redirect, do not call a tool',
      path: ENTITY_ANALYTICS_UI_PATHS.entityResolutionBulk,
    },
  ];

  it.each(redirectSections)(
    '$heading calls the link tool with its path',
    ({ content, heading, path }) => {
      const section = sectionOf(content, heading);

      expect(section).toContain(LINK_TOOL);
      expect(section).toContain(`path: '${path}'`);
    }
  );

  it('does not let the engine-status intent be answered from tool output', () => {
    const section = sectionOf(
      ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      '### Entity store / engine status'
    );

    expect(section).toContain('Do not answer this one from tool output');
  });

  it('does not let the risk-engine intent be answered from the current configuration', () => {
    const section = sectionOf(
      ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      '### Risk engine — scoring configuration'
    );

    expect(section).toContain('The link is the answer here');
  });

  it('does not ask for a CSV that was not attached', () => {
    const section = sectionOf(
      ENTITY_ANALYTICS_UI_NAVIGATION_CONTENT,
      '### Asset criticality — bulk / CSV operations'
    );

    expect(section).toContain('did not attach does **not** change the destination');
    expect(section).toContain('Never ask for the file first');
  });

  it('requires the flyout deep-link when the user explicitly asks to see the panel', () => {
    const section = sectionOf(
      RESOLUTION_UI_NAVIGATION_CONTENT,
      '### Open the resolution flyout — fallback, not a first choice'
    );

    expect(section).toContain('the **first action of the turn**');
    expect(section).toContain('`flyout=` deep-link');
  });
});
