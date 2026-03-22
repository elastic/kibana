/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityFeatures } from './types';

/**
 * Builds a structured LLM prompt for MITRE ATT&CK mapping.
 *
 * The prompt includes:
 * - Alert context (process, network, file, registry details)
 * - MITRE ATT&CK framework reference (top 50 techniques for 80% coverage)
 * - Expected output format (JSON with techniques, tactics, phase, reasoning)
 *
 * Optimized for Claude Haiku (fast, cost-effective, ~2000 tokens)
 *
 * @param features - Extracted security features from alert
 * @returns LLM prompt string ready for invocation
 */
export function buildMitrePrompt(features: SecurityFeatures): string {
  const alertDetails = buildAlertContext(features);

  return `You are a cybersecurity expert specializing in MITRE ATT&CK framework v14.

Your task: Map this security alert to MITRE ATT&CK techniques with high confidence.

Alert Details:
${alertDetails}

MITRE ATT&CK Top Techniques (80% Coverage):
- T1059 (Command and Scripting Interpreter)
  - T1059.001 (PowerShell)
  - T1059.003 (Windows Command Shell)
  - T1059.006 (Python)
- T1071 (Application Layer Protocol)
  - T1071.001 (Web Protocols)
  - T1071.004 (DNS)
- T1055 (Process Injection)
- T1003 (OS Credential Dumping)
  - T1003.001 (LSASS Memory)
- T1021 (Remote Services)
  - T1021.001 (Remote Desktop Protocol)
  - T1021.002 (SMB/Windows Admin Shares)
- T1070 (Indicator Removal)
  - T1070.004 (File Deletion)
- T1027 (Obfuscated Files or Information)
- T1053 (Scheduled Task/Job)
- T1105 (Ingress Tool Transfer)
- T1204 (User Execution)
- T1566 (Phishing)
- T1190 (Exploit Public-Facing Application)
- T1078 (Valid Accounts)
- T1562 (Impair Defenses)
- T1486 (Data Encrypted for Impact)

Tactics (14 total):
- TA0001 (Initial Access)
- TA0002 (Execution)
- TA0003 (Persistence)
- TA0004 (Privilege Escalation)
- TA0005 (Defense Evasion)
- TA0006 (Credential Access)
- TA0007 (Discovery)
- TA0008 (Lateral Movement)
- TA0009 (Collection)
- TA0010 (Exfiltration)
- TA0011 (Command and Control)
- TA0040 (Impact)

Return ONLY valid JSON (no markdown, no explanation):
{
  "techniques": [{"id": "T1059.001", "name": "PowerShell", "confidence": 0.95}],
  "tactics": [{"id": "TA0002", "name": "Execution"}],
  "phase": "Execution",
  "reasoning": "PowerShell execution with encoded command indicates script-based execution technique"
}

Rules:
1. Confidence 0-1 (1.0 = certain, 0.5 = likely, 0.7 minimum threshold)
2. Only return techniques you're confident about (>=0.7)
3. If insufficient evidence, return empty arrays
4. Always provide brief reasoning (1 sentence max)
5. Return ONLY the JSON object, no markdown formatting`;
}

/**
 * Builds alert context string from security features.
 * Only includes fields that have values to keep prompt concise.
 */
function buildAlertContext(features: SecurityFeatures): string {
  const lines: string[] = [];

  if (features.processName) {
    lines.push(`Process: ${features.processName}`);
  }

  if (features.processCommandLine) {
    // Truncate very long command lines to keep prompt size manageable
    const cmdLine =
      features.processCommandLine.length > 200
        ? `${features.processCommandLine.substring(0, 200)}...`
        : features.processCommandLine;
    lines.push(`Command Line: ${cmdLine}`);
  }

  if (features.eventAction) {
    lines.push(`Event Action: ${features.eventAction}`);
  }

  if (features.networkProtocol) {
    const direction = features.networkDirection || 'unknown';
    lines.push(`Network: ${features.networkProtocol} (${direction})`);
  }

  if (features.sourceIp && features.destinationIp) {
    lines.push(`Connection: ${features.sourceIp} → ${features.destinationIp}`);
  }

  if (features.fileName) {
    const path = features.filePath || '';
    lines.push(`File: ${features.fileName}${path ? ` (${path})` : ''}`);
  }

  if (features.fileHash) {
    lines.push(`File Hash (SHA256): ${features.fileHash}`);
  }

  if (features.registryPath) {
    lines.push(`Registry: ${features.registryPath}`);
    if (features.registryValue) {
      lines.push(`Registry Value: ${features.registryValue}`);
    }
  }

  if (features.userDomain) {
    lines.push(`User Domain: ${features.userDomain}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No security context available';
}
