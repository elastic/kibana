/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { createDetectionCoverageSkill, DETECTION_COVERAGE_VERDICTS } from '.';

const skill = createDetectionCoverageSkill();

describe('detection-coverage', () => {
  it('validates as a skill definition', async () => {
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
  });

  it('has a description within the 1024 char limit', () => {
    expect(skill.description.length).toBeLessThanOrEqual(1024);
  });

  it('brings no tools of its own except the redirect link builder', () => {
    expect(skill.getInlineTools).toBeUndefined();
    expect(skill.getRegistryTools!()).toEqual(['security.build_redirect_url']);
  });

  it('orchestrates by loading the two sibling search skills', () => {
    expect(skill.content).toMatch(/load_skill.*find-security-rules/s);
    expect(skill.content).toMatch(/load_skill.*recommend-prebuilt-rules/s);
  });

  // The loaded siblings say "never suggest enabling or installing". This skill intentionally
  // can recommend those routes, so the precedence statement prevents the loaded read-only
  // stances from overriding its verdict.
  it('states that its routing wins over the loaded skills read-only stance', () => {
    expect(skill.content).toMatch(/Precedence/);
    expect(skill.content).toMatch(/That restriction is theirs, not yours/);
  });

  // The worker YAML pins the same list from its side (detection_coverage.test.ts in
  // kbn-workflows). Both tests must be updated together to add a verdict, which is the
  // point: a verdict with no switch case silently becomes report-only.
  it('documents every canonical verdict', () => {
    for (const verdict of DETECTION_COVERAGE_VERDICTS) {
      expect(skill.content).toContain(verdict);
    }
  });

  it('pins the canonical verdict list so the worker schema cannot drift', () => {
    expect([...DETECTION_COVERAGE_VERDICTS]).toEqual([
      'covered_enabled',
      'covered_disabled',
      'prebuilt_available',
      'no_coverage',
    ]);
  });

  it('maps every verdict to exactly one route in the verdict table', () => {
    const table = skill.content.slice(skill.content.indexOf('## Verdicts and Routes'));
    for (const verdict of DETECTION_COVERAGE_VERDICTS) {
      const rows = table.split('\n').filter((line) => line.startsWith(`| \`${verdict}\``));
      expect(rows).toHaveLength(1);
    }
  });

  it('routes actions to owners instead of acting', () => {
    expect(skill.content).toMatch(/You never perform the action/);
    expect(skill.content).toMatch(/rules\/id\//);
    expect(skill.content).toMatch(/add_rules/);
    expect(skill.content).toMatch(/Never claim you enabled anything/);
  });

  it('routes a fully specified request straight to rule building', () => {
    expect(skill.content).toContain('## Intent Gate');
    expect(skill.content).toMatch(/A query is supplied/);
    expect(skill.content).toMatch(/Do not run a search then/);
  });

  it('keeps automated callers on the full check', () => {
    expect(skill.content).toMatch(/Automated callers.*always run the full check/s);
  });

  // The first line is the machine-readable contract: chat readers and the workflow's
  // structured output both key on the verdict. An answer that only describes the
  // situation cannot be acted on, so the shape is spelled out, not implied.
  it('demands one literal verdict token on the first line', () => {
    expect(skill.content).toMatch(/Open every answer with the verdict line/);
    expect(skill.content).toMatch(/Write the verdict token literally/);
    expect(skill.content).toMatch(/Write exactly one/);
  });

  it('names the word-match search limit', () => {
    expect(skill.content).toMatch(/matches exact words in rule names and descriptions/);
  });
});
