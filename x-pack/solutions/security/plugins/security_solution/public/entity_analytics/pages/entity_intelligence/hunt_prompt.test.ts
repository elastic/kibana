/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_TEMPLATES, buildHuntPrompt, resolveHuntSubmission } from './hunt_prompt';

describe('resolveHuntSubmission', () => {
  it('uses the free-text question for both display and the scoped prompt', () => {
    const submission = resolveHuntSubmission('  Which users spiked in risk?  ');

    expect(submission.displayText).toBe('Which users spiked in risk?');
    expect(submission.scopedPrompt).toBe(buildHuntPrompt('Which users spiked in risk?'));
    // The engineered index scope is present in the sent prompt.
    expect(submission.scopedPrompt).toContain('.alerts-security.alerts-*');
  });

  it('shows the readable template intent but sends the engineered request', () => {
    const template = HUNT_TEMPLATES[0];
    const submission = resolveHuntSubmission(template.intent, template);

    expect(submission.displayText).toBe(template.intent);
    // The analyst-facing display text must not leak the index/field plumbing.
    expect(submission.displayText).not.toContain('.alerts-security.alerts-*');
    expect(submission.displayText).not.toContain('logs-*');
    // The agent still receives the fully scoped engineered request.
    expect(submission.scopedPrompt).toBe(buildHuntPrompt(template.request));
    expect(submission.scopedPrompt).toContain('.alerts-security.alerts-*');
  });

  it('does not treat detection alerts as confirmed attacks', () => {
    const prompt = buildHuntPrompt('Investigate activity');
    expect(prompt).toContain('an alert does not establish a confirmed attack');
  });

  it('keeps every template intent free of raw index/field engineering', () => {
    for (const template of HUNT_TEMPLATES) {
      expect(template.intent).not.toContain('.alerts-security.alerts-*');
      expect(template.intent).not.toContain('logs-*');
      expect(template.intent).not.toContain('user.name');
      expect(template.intent.length).toBeGreaterThan(0);
    }
  });
});
