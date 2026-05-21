/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_FIND_RULES_TOOL_ID, SECURITY_ALERTS_TOOL_ID } from '../../tools';
import { findRulesSkill } from './find_rules_skill';

describe('findRulesSkill', () => {
  it('has stable metadata', () => {
    expect(findRulesSkill.id).toBe('find-rules');
    expect(findRulesSkill.name).toBe('find-rules');
    expect(findRulesSkill.basePath).toBe('skills/security/rules');
    expect(findRulesSkill.description).toContain('detection rules');
  });

  it('exposes the expected registry tools', () => {
    const tools = findRulesSkill.getRegistryTools?.() ?? [];
    expect(tools).toEqual([SECURITY_FIND_RULES_TOOL_ID, SECURITY_ALERTS_TOOL_ID]);
  });

  it('stays within the Agent Builder per-skill tool-count guideline (<= 5)', () => {
    const tools = findRulesSkill.getRegistryTools?.() ?? [];
    expect(tools.length).toBeLessThanOrEqual(5);
  });

  it('does not expose inline tools (registry-tool-only skill)', () => {
    expect(findRulesSkill.getInlineTools).toBeUndefined();
  });

  it('content includes the negative-routing guidance for sibling skills', () => {
    expect(findRulesSkill.content).toMatch(/alert-analysis/);
    expect(findRulesSkill.content).toMatch(/detection-rule-edit/);
    expect(findRulesSkill.content).toMatch(/threat-hunting/);
    expect(findRulesSkill.content).toMatch(/rule-management/);
  });

  it('content advertises the read-only action limitations', () => {
    // Guards against silently dropping the no-bulk-mutation guidance — see issue #17259.
    expect(findRulesSkill.content).toMatch(/not supported/i);
    expect(findRulesSkill.content).toMatch(/bulk enable/i);
    expect(findRulesSkill.content).toMatch(/Do NOT.*sub-agent/i);
    expect(findRulesSkill.content).toMatch(/_bulk_action/);
  });

  it('content enforces hallucination guards', () => {
    expect(findRulesSkill.content).toMatch(/never invent/i);
    expect(findRulesSkill.content).toMatch(/Grounding/i);
  });

  it('content teaches discover-then-filter for tags', () => {
    expect(findRulesSkill.content).toMatch(/groupBy: "tags"/);
    expect(findRulesSkill.content).toMatch(/Tag Discovery/i);
    // MITRE IDs are the exception — direct filter, no discovery.
    expect(findRulesSkill.content).toMatch(/structured MITRE IDs/i);
  });

  it('content teaches the array-of-arrays filter shape (outer=OR, inner=AND)', () => {
    expect(findRulesSkill.content).toMatch(/outer array = OR/);
    expect(findRulesSkill.content).toMatch(/inner array = AND/);
    expect(findRulesSkill.content).toMatch(/one atomic fact/);
    // Spot-check one of the new pattern examples to ensure shape is taught.
    expect(findRulesSkill.content).toContain('[[{ severity: "critical" }, { tag: "MITRE" }]]');
    // The "both tags" case is the design's marquee capability — make sure it stays documented.
    expect(findRulesSkill.content).toContain('[[{ tag: "MITRE" }, { tag: "Custom" }]]');
  });

  it('content requires tag discovery without exception', () => {
    // The prompt and the eval suite must stay aligned: any tag filter requires groupBy:"tags" first.
    expect(findRulesSkill.content).toMatch(/ALWAYS Discover/i);
    expect(findRulesSkill.content).toMatch(/No Exceptions/i);
  });

  it('content teaches UUID translation for the noisy-rules flow', () => {
    expect(findRulesSkill.content).toMatch(/kibana\.alert\.rule\.uuid/);
    expect(findRulesSkill.content).toContain('{ ruleUuid:');
    // Names are explicitly NOT used because they are not guaranteed unique.
    expect(findRulesSkill.content).toMatch(/NOT.*kibana\.alert\.rule\.name/i);
  });
});
