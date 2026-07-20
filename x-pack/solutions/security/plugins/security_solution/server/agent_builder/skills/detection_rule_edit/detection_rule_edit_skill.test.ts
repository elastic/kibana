/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0. and/or licensed to Elasticsearch B.V. under one of the contributor
 * license agreements.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_RUN_RULE_PREVIEW_TOOL_ID,
} from '../../tools';
import { getDetectionRuleEditSkill } from '.';

describe('getDetectionRuleEditSkill', () => {
  describe('stable metadata', () => {
    it('uses the detection-rule-edit id, name, and basePath regardless of the preview flag', () => {
      for (const rulePreviewEnabled of [true, false]) {
        const skill = getDetectionRuleEditSkill({ rulePreviewEnabled });
        expect(skill.id).toBe('detection-rule-edit');
        expect(skill.name).toBe('detection-rule-edit');
        expect(skill.basePath).toBe('skills/security/rules');
        expect(skill.description).toContain('create, edit, modify, or update a detection rule');
      }
    });

    it('keeps the router-facing description stable across the preview flag', () => {
      // The description field is what the skill router matches on; it must not change
      // with rulePreviewEnabled, or routing regressions slip in silently.
      const withPreview = getDetectionRuleEditSkill({ rulePreviewEnabled: true }).description;
      const withoutPreview = getDetectionRuleEditSkill({ rulePreviewEnabled: false }).description;
      expect(withPreview).toEqual(withoutPreview);
    });
  });

  describe('registry tools', () => {
    it('exposes create_detection_rule, labs_search, generate_esql, and product_documentation when preview is disabled', () => {
      const skill = getDetectionRuleEditSkill({ rulePreviewEnabled: false });
      expect(skill.getRegistryTools!()).toEqual([
        SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
        SECURITY_LABS_SEARCH_TOOL_ID,
        platformCoreTools.generateEsql,
        platformCoreTools.productDocumentation,
      ]);
    });

    it('adds run_rule_preview only when rulePreviewEnabled is true', () => {
      const skill = getDetectionRuleEditSkill({ rulePreviewEnabled: true });
      expect(skill.getRegistryTools!()).toEqual([
        SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
        SECURITY_LABS_SEARCH_TOOL_ID,
        platformCoreTools.generateEsql,
        platformCoreTools.productDocumentation,
        SECURITY_RUN_RULE_PREVIEW_TOOL_ID,
      ]);
    });
  });

  describe('core content invariants (hold regardless of the preview flag)', () => {
    const getContent = (rulePreviewEnabled: boolean) =>
      getDetectionRuleEditSkill({ rulePreviewEnabled }).content;

    it('restricts to ES|QL rules', () => {
      for (const rulePreviewEnabled of [true, false]) {
        const content = getContent(rulePreviewEnabled);
        expect(content).toMatch(/Only create ES\|QL rules/);
        expect(content).toMatch(/rule type ES\|QL/);
      }
    });

    it('mandates reading the attachment before any edit', () => {
      for (const rulePreviewEnabled of [true, false]) {
        expect(getContent(rulePreviewEnabled)).toMatch(/attachment_read/);
        expect(getContent(rulePreviewEnabled)).toMatch(/ALWAYS read the attachment before/i);
      }
    });

    it('mandates re-stringifying the full rule object on edit', () => {
      for (const rulePreviewEnabled of [true, false]) {
        expect(getContent(rulePreviewEnabled)).toMatch(
          /re-stringify the (ENTIRE|FULL) rule object/i
        );
      }
    });

    it('mandates rendering the attachment inline after every modification', () => {
      for (const rulePreviewEnabled of [true, false]) {
        expect(getContent(rulePreviewEnabled)).toMatch(/<render_attachment/);
        expect(getContent(rulePreviewEnabled)).toMatch(
          /render the attachment inline after EVERY modification/i
        );
      }
    });

    it('uses security.create_detection_rule for new rules', () => {
      for (const rulePreviewEnabled of [true, false]) {
        expect(getContent(rulePreviewEnabled)).toMatch(/security\.create_detection_rule/);
      }
    });
  });

  describe('preview branch (rulePreviewEnabled: true only)', () => {
    const content = getDetectionRuleEditSkill({ rulePreviewEnabled: true }).content;

    it('instructs the model to use a CLI command string, not a rule object', () => {
      expect(content).toMatch(/CLI-style `command` string/);
      expect(content).toMatch(/not a rule object/i);
    });

    it('documents the esql subcommand shape', () => {
      expect(content).toMatch(/esql --query/);
      expect(content).toMatch(/--timeframe-start/);
      expect(content).toMatch(/--interval/);
    });

    it('requires single-line ES|QL queries and forbids literal newline escapes', () => {
      expect(content).toMatch(/single line/i);
      expect(content).toMatch(/Do \*\*not\*\*.*embed newline characters/i);
    });

    it('forbids guessing an index and prefers lightweight list_indices for discovery', () => {
      // generate_esql is a heavy NL->ES|QL LLM tool; list_indices is metadata-only.
      // Discovery should lead with list_indices, with generate_esql reserved for
      // probing fields/sample values.
      expect(content).toMatch(/list_indices/i);
      expect(content).toMatch(/Do not guess an index/i);
    });

    it('treats zero-preview-alerts as not-success and requires re-verification', () => {
      expect(content).toMatch(/Zero alerts is not success/i);
      expect(content).toMatch(/generate_esql/);
      // Escalation should first try a wider timeframe (cheap) before the heavy
      // generate_esql probe.
      expect(content).toMatch(/wider timeframe/i);
    });

    it('adds the preview checklist item only on this branch', () => {
      expect(content).toMatch(/security\.run_rule_preview.*CLI `command` string/);
      expect(content).toMatch(/zero alerts.*verify index\/data with `generate_esql`/i);
    });
  });

  describe('non-preview branch (rulePreviewEnabled: false)', () => {
    const content = getDetectionRuleEditSkill({ rulePreviewEnabled: false }).content;

    it('omits the preview step and its checklist item', () => {
      expect(content).not.toMatch(/### Step 4: Preview the Rule/);
      expect(content).not.toMatch(/security\.run_rule_preview/);
    });

    it('still has the non-preview checklist intact', () => {
      expect(content).toMatch(/Checklist before finishing the answer/);
      expect(content).toMatch(/Did I call the tool read attachment first/);
      expect(content).toMatch(/Did I render inline the latest version of the attachment/);
    });
  });
});
