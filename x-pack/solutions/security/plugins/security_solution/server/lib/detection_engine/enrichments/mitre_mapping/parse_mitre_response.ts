/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreMapping } from './types';

/**
 * Parses LLM response into structured MITRE ATT&CK mapping.
 *
 * Handles:
 * - JSON extraction from markdown-wrapped responses
 * - Validation of required fields (techniques, tactics, phase, reasoning)
 * - Graceful degradation on parse failures
 * - Confidence filtering (>=0.7 threshold)
 *
 * @param response - Raw LLM response string (may contain markdown or plain JSON)
 * @returns Parsed MITRE mapping or empty mapping on failure
 */
export function parseMitreResponse(response: string): MitreMapping {
  try {
    // Extract JSON from response (LLM may wrap in ```json or ``` blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createEmptyMapping('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!isValidMitreResponse(parsed)) {
      return createEmptyMapping('Invalid response structure from LLM');
    }

    // Filter techniques by confidence threshold (>=0.7)
    const filteredTechniques = (parsed.techniques || []).filter(
      (t: any) => t.confidence >= 0.7
    );

    return {
      techniques: filteredTechniques,
      tactics: parsed.tactics || [],
      phase: parsed.phase || 'Unknown',
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    // Log error for debugging but don't fail alert creation
    console.error('Failed to parse MITRE response:', error);
    return createEmptyMapping('Parse error: ' + (error as Error).message);
  }
}

/**
 * Validates that parsed response has expected structure.
 */
function isValidMitreResponse(parsed: any): boolean {
  return (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray(parsed.techniques) &&
    Array.isArray(parsed.tactics) &&
    typeof parsed.phase === 'string' &&
    typeof parsed.reasoning === 'string'
  );
}

/**
 * Creates empty mapping for graceful degradation.
 */
function createEmptyMapping(reason: string): MitreMapping {
  return {
    techniques: [],
    tactics: [],
    phase: 'Unknown',
    reasoning: reason,
  };
}

/**
 * Validates a single MITRE technique object.
 * Ensures id, name, and confidence fields are present and valid.
 */
export function isValidTechnique(technique: any): boolean {
  return (
    technique &&
    typeof technique.id === 'string' &&
    technique.id.match(/^T\d{4}(\.\d{3})?$/) !== null && // Match T1234 or T1234.001
    typeof technique.name === 'string' &&
    typeof technique.confidence === 'number' &&
    technique.confidence >= 0 &&
    technique.confidence <= 1
  );
}

/**
 * Validates a single MITRE tactic object.
 * Ensures id and name fields are present and valid.
 */
export function isValidTactic(tactic: any): boolean {
  return (
    tactic &&
    typeof tactic.id === 'string' &&
    tactic.id.match(/^TA\d{4}$/) !== null && // Match TA0001
    typeof tactic.name === 'string'
  );
}
