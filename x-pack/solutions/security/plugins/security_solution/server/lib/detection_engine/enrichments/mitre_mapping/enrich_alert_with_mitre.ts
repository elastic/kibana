/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreMapping } from './types';

/**
 * Enriches a security alert with MITRE ATT&CK tags.
 *
 * Adds ECS-compliant threat fields:
 * - threat.framework: "MITRE ATT&CK v14"
 * - threat.technique.id: Array of technique IDs (e.g., ["T1059.001", "T1055"])
 * - threat.technique.name: Array of technique names (e.g., ["PowerShell", "Process Injection"])
 * - threat.tactic.id: Array of tactic IDs (e.g., ["TA0002", "TA0005"])
 * - threat.tactic.name: Array of tactic names (e.g., ["Execution", "Defense Evasion"])
 * - threat.phase: Attack phase (e.g., "Execution")
 * - Additional metadata: reasoning, source, timestamp
 *
 * **ECS Compliance:**
 * Uses standard `threat.*` fields compatible with Kibana SIEM visualizations,
 * MITRE ATT&CK Navigator integration, and Elastic detection rules.
 *
 * **No-op if mapping empty:**
 * Returns original alert unchanged if mapping has no techniques
 * (avoids polluting alerts with empty MITRE fields)
 *
 * @param alert - Original security alert
 * @param mapping - MITRE ATT&CK mapping from LLM
 * @returns Enriched alert with MITRE tags (or original if mapping empty)
 */
export function enrichAlertWithMitre(
  alert: Record<string, any>,
  mapping: MitreMapping
): Record<string, any> {
  // Skip enrichment if no techniques found
  if (!mapping.techniques || mapping.techniques.length === 0) {
    return alert;
  }

  return {
    ...alert,
    // Standard ECS threat fields
    'threat.framework': 'MITRE ATT&CK',
    'threat.framework.version': 'v14',

    // Technique fields (array of IDs and names)
    'threat.technique.id': mapping.techniques.map((t) => t.id),
    'threat.technique.name': mapping.techniques.map((t) => t.name),

    // Tactic fields (array of IDs and names)
    'threat.tactic.id': mapping.tactics.map((t) => t.id),
    'threat.tactic.name': mapping.tactics.map((t) => t.name),

    // Attack phase
    'threat.phase': mapping.phase,

    // Metadata for traceability
    'kibana.alert.mitre.reasoning': mapping.reasoning,
    'kibana.alert.mitre.mapping_source': 'llm_auto_map',
    'kibana.alert.mitre.mapping_timestamp': new Date().toISOString(),

    // Confidence scores (for future UI display)
    'kibana.alert.mitre.technique_confidence': mapping.techniques.map((t) => ({
      technique_id: t.id,
      confidence: t.confidence,
    })),
  };
}

/**
 * Checks if an alert already has MITRE mappings from the rule.
 * Used to avoid duplicate mapping (e.g., if rule already has manual MITRE tags).
 *
 * **Hybrid approach:** Returns true if rule has MITRE tags
 * (kibana.alert.rule.threat exists). Auto-mapper will still run if
 * it detects high-confidence additional techniques the rule missed.
 *
 * @param alert - Alert to check
 * @returns true if alert has MITRE tags from rule definition
 */
export function hasRuleMitreMapping(alert: Record<string, any>): boolean {
  const ruleThreat = alert['kibana.alert.rule.threat'];

  // Check if rule has MITRE tags (array with at least one entry)
  return Boolean(
    ruleThreat &&
    Array.isArray(ruleThreat) &&
    ruleThreat.length > 0 &&
    ruleThreat[0].framework === 'MITRE ATT&CK'
  );
}

/**
 * Checks if alert already has alert-level MITRE mappings.
 * Different from rule-level tags (kibana.alert.rule.threat).
 *
 * @param alert - Alert to check
 * @returns true if alert already has alert-level MITRE tags
 */
export function hasAlertMitreMapping(alert: Record<string, any>): boolean {
  return Boolean(
    alert['threat.framework'] ||
    alert['threat.technique.id'] ||
    alert['threat.tactic.id']
  );
}

/**
 * Determines if auto-mapping should run despite rule having MITRE tags.
 *
 * **Hybrid Logic:**
 * - Always map if rule has NO tags
 * - Skip if rule has tags AND alert content doesn't suggest additional techniques
 * - Run if alert shows high-confidence indicators of additional TTPs
 *
 * **High-confidence indicators:**
 * - Network exfiltration (destination.ip + large bytes_out)
 * - Credential dumping (lsass.exe access)
 * - Lateral movement (SMB + admin shares)
 * - Multi-stage attack (process chain)
 *
 * @param alert - Alert to analyze
 * @returns true if should run auto-mapper despite rule tags existing
 */
export function shouldAutoMapDespiteRuleTags(alert: Record<string, any>): boolean {
  // No rule tags → always map
  if (!hasRuleMitreMapping(alert)) {
    return true;
  }

  // Rule has tags → Check for high-confidence additional indicators
  const features = {
    hasNetworkExfil: Boolean(
      alert['destination.ip'] &&
      alert['network.direction'] === 'outbound' &&
      (alert['network.bytes'] || 0) > 100000 // >100KB outbound
    ),
    hasCredentialDump: Boolean(
      alert['process.name']?.toLowerCase().includes('lsass') ||
      alert['file.path']?.toLowerCase().includes('sam') ||
      alert['registry.path']?.toLowerCase().includes('sam')
    ),
    hasLateralMovement: Boolean(
      (alert['network.protocol'] === 'smb' || alert['destination.port'] === 445) &&
      alert['user.domain']
    ),
    hasProcessChain: Boolean(
      alert['process.parent.name'] &&
      alert['process.parent.name'] !== 'explorer.exe' &&
      alert['process.parent.name'] !== 'services.exe'
    ),
  };

  // Run auto-mapper if ANY high-confidence indicator present
  return Object.values(features).some((indicator) => indicator === true);
}

/**
 * Merges LLM-generated MITRE mappings with existing rule tags.
 * Deduplicates techniques and tactics.
 *
 * **Used when:** Rule has MITRE tags but auto-mapper found additional TTPs
 *
 * @param alert - Alert with rule MITRE tags
 * @param mapping - New LLM-generated mapping
 * @returns Alert with merged MITRE tags (rule + LLM)
 */
export function mergeWithRuleMitreMapping(
  alert: Record<string, any>,
  mapping: MitreMapping
): Record<string, any> {
  // Extract rule-level techniques (from kibana.alert.rule.threat)
  const ruleThreat = alert['kibana.alert.rule.threat'] || [];
  const ruleTechniqueIds = ruleThreat.flatMap((threat: any) =>
    (threat.technique || []).map((t: any) => t.id)
  );

  // Extract existing alert-level techniques (if any)
  const existingAlertTechniqueIds = Array.isArray(alert['threat.technique.id'])
    ? alert['threat.technique.id']
    : [];

  const allExistingIds = [...ruleTechniqueIds, ...existingAlertTechniqueIds];

  // New techniques from LLM (not already in rule or alert)
  const newTechniques = mapping.techniques.filter(
    (t) => !allExistingIds.includes(t.id)
  );

  if (newTechniques.length === 0) {
    return alert; // No new techniques found, return unchanged
  }

  // Build combined technique list (rule + existing + new)
  return {
    ...alert,
    // Standard ECS threat fields (ALERT-LEVEL, not rule-level)
    'threat.framework': 'MITRE ATT&CK',
    'threat.framework.version': 'v14',

    // Combine: existing alert-level + new LLM techniques
    'threat.technique.id': [
      ...existingAlertTechniqueIds,
      ...newTechniques.map((t) => t.id),
    ],
    'threat.technique.name': [
      ...(alert['threat.technique.name'] || []),
      ...newTechniques.map((t) => t.name),
    ],

    // Tactics from new techniques
    'threat.tactic.id': [
      ...(alert['threat.tactic.id'] || []),
      ...mapping.tactics.map((t) => t.id),
    ],
    'threat.tactic.name': [
      ...(alert['threat.tactic.name'] || []),
      ...mapping.tactics.map((t) => t.name),
    ],

    // Attack phase (use LLM's if not set)
    'threat.phase': alert['threat.phase'] || mapping.phase,

    // Metadata
    'kibana.alert.mitre.reasoning': mapping.reasoning,
    'kibana.alert.mitre.mapping_source': 'llm_auto_map+rule',
    'kibana.alert.mitre.mapping_timestamp': new Date().toISOString(),
    'kibana.alert.mitre.additional_techniques_found': newTechniques.length,
  };
}
