/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security-skills routing dataset — parsed at runtime from security_skills_dataset.csv.
 *
 * Adding or modifying examples requires only editing the CSV — this file stays untouched.
 *
 * CSV columns:
 *   category                   — find-rules | distractor
 *   query_intent               — short human label for the query's intent
 *   query                      — the user prompt sent to the agent
 *   expected_skill             — skill that MUST load (positive assertion)
 *   should_not_activate_skill  — skill that MUST NOT load (distractor assertion)
 *   expected_only_tool_id      — domain tool the agent must call exclusively (ToolUsageOnly)
 *   tool_sequence              — pipe (|) list; golden ordered tool trajectory (Trajectory)
 *   dataset_split              — base | distractor
 *   is_distractor              — true | (empty)
 *   reference                  — reference answer used by correctness/groundedness evaluators
 *   notes                      — free-form annotation (metadata only)
 *
 * Ground truth wiring (read by evaluators via the `expected` parameter):
 *   find-rules   → expectedSkill = expected_skill (that skill must load)
 *   distractor   → shouldNotActivateSkill = should_not_activate_skill (no skill loads; fallback)
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import type { SecuritySkillsExample, SecuritySkillsCategory } from '../dataset';

interface SecuritySkillsCsvRow {
  category: string;
  query_intent: string;
  query: string;
  expected_skill: string;
  should_not_activate_skill: string;
  expected_only_tool_id: string;
  tool_sequence: string;
  dataset_split: string;
  is_distractor: string;
  reference: string;
  notes: string;
}

function parseToolSequence(raw: string): string[] | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseDatasetSplit(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return ['base'];
  return trimmed
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseCsv(): SecuritySkillsExample[] {
  const csvPath = path.join(__dirname, 'security_skills_dataset.csv');
  const csvString = fs.readFileSync(csvPath, 'utf-8');

  const { data } = Papa.parse<SecuritySkillsCsvRow>(csvString, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  return data.map((row) => {
    const expectedSkill = row.expected_skill.trim();
    const shouldNotActivateSkill = row.should_not_activate_skill.trim();
    const expectedOnlyToolId = row.expected_only_tool_id.trim();
    const toolSequence = parseToolSequence(row.tool_sequence);
    const datasetSplit = parseDatasetSplit(row.dataset_split);
    const isDistractor = row.is_distractor.trim().toLowerCase() === 'true';
    const category = row.category.trim() as SecuritySkillsCategory;

    return {
      input: { question: row.query.trim() },
      expected: {
        reference: row.reference.trim(),
        ...(expectedSkill ? { expectedSkill } : {}),
        ...(shouldNotActivateSkill ? { shouldNotActivateSkill } : {}),
        ...(toolSequence ? { tool_sequence: toolSequence } : {}),
      },
      metadata: {
        category,
        query_intent: row.query_intent.trim(),
        dataset_split: datasetSplit,
        ...(isDistractor ? { is_distractor: true } : {}),
        ...(expectedOnlyToolId ? { expectedOnlyToolId } : {}),
        ...(toolSequence ? { tool_sequence: toolSequence } : {}),
      },
    };
  });
}

export const securitySkillsExamples: SecuritySkillsExample[] = parseCsv();

export const happyPathExamples = securitySkillsExamples.filter((ex) => !ex.metadata.is_distractor);
export const distractorExamples = securitySkillsExamples.filter((ex) => ex.metadata.is_distractor);
