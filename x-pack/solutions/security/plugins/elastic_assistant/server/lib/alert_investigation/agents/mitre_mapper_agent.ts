/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';

import type { Alert, MitreMapping, TriageResult } from '../types';

/**
 * MITRE ATT&CK Mapper Agent
 *
 * Maps alerts to MITRE ATT&CK framework (tactics, techniques, attack phase)
 *
 * Foundation Spike: Simplified LLM-based mapping
 * Production: Would integrate with Detection Engine's MITRE taxonomy
 */
export const createMitreMapperAgent = (llmClient: ActionsClientLlm) => {
  const systemPrompt = `You are a MITRE ATT&CK expert mapping security alerts to the MITRE ATT&CK framework.

Your task:
1. Analyze the alert and triage context
2. Identify relevant MITRE ATT&CK techniques (with IDs like T1059.001)
3. Identify tactics (like TA0002 - Execution)
4. Determine the attack phase
5. Provide confidence level
6. Explain your reasoning

Common Technique Examples:
- T1059.001: PowerShell execution
- T1059.003: Windows Command Shell
- T1071: Application Layer Protocol (C2)
- T1053: Scheduled Task/Job
- T1078: Valid Accounts
- T1021: Remote Services
- T1003: OS Credential Dumping
- T1486: Data Encrypted for Impact (Ransomware)

Common Tactics:
- TA0001: Initial Access
- TA0002: Execution
- TA0003: Persistence
- TA0004: Privilege Escalation
- TA0005: Defense Evasion
- TA0006: Credential Access
- TA0007: Discovery
- TA0008: Lateral Movement
- TA0009: Collection
- TA0010: Exfiltration
- TA0011: Command and Control
- TA0040: Impact

Attack Phases:
- Reconnaissance
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Exfiltration
- Command and Control
- Impact

Return your result as JSON:
{
  "techniques": [
    { "id": "T1059.001", "name": "PowerShell", "confidence": "HIGH" },
    { "id": "T1021.002", "name": "SMB/Windows Admin Shares", "confidence": "MEDIUM" }
  ],
  "tactics": [
    { "id": "TA0002", "name": "Execution" },
    { "id": "TA0008", "name": "Lateral Movement" }
  ],
  "phase": "Lateral Movement",
  "confidence": "HIGH",
  "reasoning": "Alert shows PowerShell execution with remote service access patterns, indicating lateral movement phase with execution tactics."
}`;

  return {
    name: 'mitre-mapper-agent',
    systemPrompt,
    llmClient,

    /**
     * Execute MITRE mapping for an alert
     */
    async execute(alert: Alert, triageResult?: TriageResult): Promise<MitreMapping> {
      const alertContext = JSON.stringify({
        id: alert._id,
        timestamp: alert._source['@timestamp'],
        ruleName: alert._source['kibana.alert.rule.name'],
        processName: alert._source['process.name'],
        commandLine: alert._source['process.command_line'],
        eventCategory: alert._source['event.category'],
        eventType: alert._source['event.type'],
        eventAction: alert._source['event.action'],
        filePath: alert._source['file.path'],
      }, null, 2);

      const triageContext = triageResult ? `

Triage Classification:
- Severity: ${triageResult.classification}
- Attack Type: ${triageResult.attackType}
- Reasoning: ${triageResult.reasoning}
` : '';

      const prompt = `Map this security alert to MITRE ATT&CK:

Alert Details:
${alertContext}
${triageContext}

Provide MITRE ATT&CK mapping as JSON.`;

      const response = await llmClient.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      // Parse JSON response
      const content = typeof response.content === 'string' ? response.content : '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse MITRE mapping response: no JSON found');
      }

      const result = JSON.parse(jsonMatch[1] || jsonMatch[0]) as MitreMapping;

      // Validate result structure
      if (!Array.isArray(result.techniques) || !Array.isArray(result.tactics)) {
        throw new Error('Invalid MITRE mapping response structure');
      }

      return result;
    },
  };
};

/**
 * Generate ATT&CK Navigator layer JSON
 *
 * For visualization in MITRE ATT&CK Navigator
 */
export const generateAttackNavigatorLayer = (
  alertId: string,
  mapping: MitreMapping
): Record<string, unknown> => {
  return {
    name: `Alert ${alertId} - ${mapping.phase}`,
    versions: {
      attack: '14',
      navigator: '5.1.0',
    },
    domain: 'enterprise-attack',
    description: mapping.reasoning,
    techniques: mapping.techniques.map((tech) => ({
      techniqueID: tech.id,
      score: tech.confidence === 'HIGH' ? 100 : tech.confidence === 'MEDIUM' ? 50 : 25,
      color: '#ff6666',
      comment: `${tech.name} (${tech.confidence} confidence)`,
    })),
  };
};
