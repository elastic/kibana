/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';

import type { Alert, TriageResult, MitreMapping } from '../types';
import type { CTIContext } from './cti_enrichment_agent';
import type { InvestigationAnalysis } from './investigation_agent';

/**
 * Remediation Result
 */
export interface RemediationRecommendation {
  /** Recommended immediate actions */
  immediateActions: Array<{
    action: string;
    reason: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedImpact: string;
  }>;
  /** Step-by-step runbook */
  runbook: Array<{
    step: number;
    title: string;
    description: string;
    command?: string; // Optional command to execute
  }>;
  /** Containment strategy */
  containment: {
    isolateHosts: string[]; // Hosts to isolate
    blockIPs: string[]; // IPs to block
    disableAccounts: string[]; // Accounts to disable
    quarantineFiles: string[]; // Files to quarantine
  };
  /** Risk assessment if no action taken */
  riskIfNotRemediated: string;
  /** Estimated time to remediate */
  estimatedTime: string;
  /** Confidence in recommendations */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Remediation Agent
 *
 * Recommends response actions and provides step-by-step runbook
 */
export const createRemediationAgent = (llmClient: ActionsClientLlm) => {
  const systemPrompt = `You are a security incident response specialist recommending remediation actions.

Your task:
1. Analyze the investigation (triage, MITRE, CTI, evidence)
2. Recommend immediate containment actions
3. Provide step-by-step remediation runbook
4. Identify containment targets (hosts to isolate, IPs to block, accounts to disable)
5. Assess risk if no action is taken
6. Estimate time to remediate

Immediate Actions Categories:
- **CRITICAL:** Stop active breach (isolate host, kill process, block C2)
- **HIGH:** Prevent spread (disable accounts, block IPs, quarantine files)
- **MEDIUM:** Investigate further (collect forensics, check other hosts)
- **LOW:** Monitor and document (update runbook, inform team)

Remediation Principles:
- **Containment first:** Stop the bleeding before cleanup
- **Preserve evidence:** Don't delete logs or artifacts
- **Minimize impact:** Balance security with business continuity
- **Document everything:** Detailed runbook for junior analysts

Risk Assessment:
- **If not remediated:** What could happen? Data loss? Spread? Impact?

Return JSON:
{
  "immediateActions": [
    {
      "action": "Isolate HOST-5 from network",
      "reason": "Active C2 beacon detected, prevent lateral movement",
      "priority": "CRITICAL",
      "estimatedImpact": "HOST-5 will be offline, user admin cannot access"
    },
    {
      "action": "Disable user account: admin",
      "reason": "Credentials likely compromised, used in lateral movement",
      "priority": "HIGH",
      "estimatedImpact": "User admin cannot login until password reset"
    }
  ],
  "runbook": [
    {
      "step": 1,
      "title": "Isolate compromised host",
      "description": "Immediately isolate HOST-5 to prevent further lateral movement",
      "command": "POST /api/endpoint/isolate { hostId: 'HOST-5' }"
    },
    {
      "step": 2,
      "title": "Disable compromised account",
      "description": "Disable admin account in Active Directory",
      "command": "Disable-ADAccount -Identity admin"
    },
    {
      "step": 3,
      "title": "Block C2 IP addresses",
      "description": "Add firewall rules to block C2 IPs: 192.168.1.100, 10.0.0.50"
    }
  ],
  "containment": {
    "isolateHosts": ["HOST-5", "HOST-3"],
    "blockIPs": ["192.168.1.100", "10.0.0.50"],
    "disableAccounts": ["admin"],
    "quarantineFiles": ["C:\\\\Temp\\\\malware.exe"]
  },
  "riskIfNotRemediated": "Attacker maintains access via compromised admin account. Lateral movement will continue. Potential data exfiltration or ransomware deployment within 24-48 hours.",
  "estimatedTime": "30-60 minutes for full containment and remediation",
  "confidence": "HIGH"
}`;

  return {
    name: 'remediation-agent',
    systemPrompt,
    llmClient,

    async execute(
      alert: Alert,
      triageResult?: TriageResult,
      mitreMapping?: MitreMapping,
      ctiContext?: CTIContext,
      investigation?: InvestigationAnalysis
    ): Promise<RemediationRecommendation> {
      const contextSections: string[] = [];

      if (triageResult) {
        contextSections.push(`**Triage:**
- Severity: ${triageResult.classification}
- Attack Type: ${triageResult.attackType}
- Confidence: ${triageResult.confidence}%
- Reasoning: ${triageResult.reasoning}`);
      }

      if (mitreMapping) {
        contextSections.push(`**MITRE ATT&CK:**
- Techniques: ${mitreMapping.techniques.map((t) => `${t.id} (${t.name})`).join(', ')}
- Tactics: ${mitreMapping.tactics.map((t) => t.name).join(', ')}
- Phase: ${mitreMapping.phase}`);
      }

      if (ctiContext) {
        contextSections.push(`**Threat Intelligence:**
- Threat Actor: ${ctiContext.threatActor || 'Unknown'}
- Campaign: ${ctiContext.campaign || 'Unknown'}
- IOCs: ${ctiContext.iocs.length} analyzed
- Analysis: ${ctiContext.analysis}`);
      }

      if (investigation) {
        contextSections.push(`**Investigation:**
- Hypothesis: ${investigation.hypothesis}
- Evidence: ${investigation.evidence.length} findings
- Blast Radius: ${investigation.blastRadius.affectedHosts} hosts, ${investigation.blastRadius.affectedUsers} users
- Analysis: ${investigation.analysis}`);
      }

      const prompt = `Based on this comprehensive investigation, recommend remediation actions:

Alert ID: ${alert._id}

${contextSections.join('\n\n')}

Provide:
1. Immediate containment actions (prioritized)
2. Step-by-step remediation runbook
3. Specific containment targets (hosts, IPs, accounts, files)
4. Risk assessment if not remediated
5. Estimated time to complete remediation

Return remediation recommendations as JSON.`;

      const response = await llmClient.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);

      const content = typeof response.content === 'string' ? response.content : '';
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse remediation response: no JSON found');
      }

      const result = JSON.parse(jsonMatch[1] || jsonMatch[0]) as RemediationRecommendation;

      if (!Array.isArray(result.immediateActions) || !Array.isArray(result.runbook)) {
        throw new Error('Invalid remediation response structure');
      }

      return result;
    },
  };
};
