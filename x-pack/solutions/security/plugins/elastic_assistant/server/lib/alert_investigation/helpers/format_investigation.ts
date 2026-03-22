/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationResult, TriageResult, MitreMapping } from '../types';

/**
 * Format investigation result as markdown for case comment
 */
export const formatInvestigationAsMarkdown = (result: InvestigationResult): string => {
  const sections: string[] = [];

  // Header
  sections.push('## 🤖 AI-Powered Alert Investigation');
  sections.push('');
  sections.push(`**Alert ID:** ${result.alertId}`);
  sections.push(`**Investigation Time:** ${result.latencyMs}ms`);
  sections.push(`**Timestamp:** ${new Date(result.timestamp).toISOString()}`);
  sections.push('');

  // Triage Section
  if (result.triage) {
    sections.push('### 🎯 Triage Classification');
    sections.push('');
    sections.push(`**Severity:** ${result.triage.classification}`);
    sections.push(`**Attack Type:** ${result.triage.attackType}`);
    sections.push(`**Confidence:** ${result.triage.confidence}%`);

    if (result.triage.similarAlertsCount !== undefined) {
      sections.push(`**Similar Alerts:** ${result.triage.similarAlertsCount} found`);
    }

    sections.push('');
    sections.push('**Reasoning:**');
    sections.push(result.triage.reasoning);
    sections.push('');
  }

  // MITRE ATT&CK Section
  if (result.mitreMapping) {
    sections.push('### 🎭 MITRE ATT&CK Mapping');
    sections.push('');

    if (result.mitreMapping.techniques.length > 0) {
      sections.push('**Techniques:**');
      result.mitreMapping.techniques.forEach((tech) => {
        sections.push(`- **${tech.id}** - ${tech.name} (${tech.confidence} confidence)`);
      });
      sections.push('');
    }

    if (result.mitreMapping.tactics.length > 0) {
      sections.push('**Tactics:**');
      result.mitreMapping.tactics.forEach((tactic) => {
        sections.push(`- ${tactic.name} (${tactic.id})`);
      });
      sections.push('');
    }

    sections.push(`**Attack Phase:** ${result.mitreMapping.phase}`);
    sections.push(`**Confidence:** ${result.mitreMapping.confidence}`);
    sections.push('');
    sections.push('**Reasoning:**');
    sections.push(result.mitreMapping.reasoning);
    sections.push('');
  }

  // CTI Section
  if (result.ctiContext) {
    sections.push('### 🔍 Threat Intelligence');
    sections.push('');

    if (result.ctiContext.threatActor) {
      sections.push(`**Threat Actor:** ${result.ctiContext.threatActor}`);
    }
    if (result.ctiContext.campaign) {
      sections.push(`**Campaign:** ${result.ctiContext.campaign}`);
    }

    if (result.ctiContext.iocs && result.ctiContext.iocs.length > 0) {
      sections.push('');
      sections.push('**IOCs Analyzed:**');
      result.ctiContext.iocs.slice(0, 5).forEach((ioc: any) => {
        sections.push(`- **${ioc.value}** (${ioc.type}) - ${ioc.reputation}`);
      });
      if (result.ctiContext.iocs.length > 5) {
        sections.push(`- ...and ${result.ctiContext.iocs.length - 5} more`);
      }
    }

    sections.push('');
    sections.push(`**Confidence:** ${result.ctiContext.confidence}`);
    sections.push('');
    sections.push('**Analysis:**');
    sections.push(result.ctiContext.analysis);
    sections.push('');
  }

  // Investigation Section
  if (result.investigation) {
    sections.push('### 🔬 Deep Investigation');
    sections.push('');

    sections.push('**Hypothesis:**');
    sections.push(result.investigation.hypothesis);
    sections.push('');

    if (result.investigation.evidence && result.investigation.evidence.length > 0) {
      sections.push('**Evidence:**');
      result.investigation.evidence.forEach((evidence: any, idx: number) => {
        sections.push(`${idx + 1}. ${evidence.description} (${evidence.matchCount} matches)`);
      });
      sections.push('');
    }

    if (result.investigation.blastRadius) {
      sections.push('**Blast Radius:**');
      sections.push(`- Affected Hosts: ${result.investigation.blastRadius.affectedHosts}`);
      sections.push(`- Affected Users: ${result.investigation.blastRadius.affectedUsers}`);
      if (result.investigation.blastRadius.affectedAssets?.length > 0) {
        sections.push(`- Assets: ${result.investigation.blastRadius.affectedAssets.join(', ')}`);
      }
      sections.push('');
    }

    sections.push(`**Confidence:** ${result.investigation.confidence}`);
    sections.push('');
  }

  // Remediation Section
  if (result.remediation) {
    sections.push('### 🛡️ Remediation Recommendations');
    sections.push('');

    if (result.remediation.immediateActions && result.remediation.immediateActions.length > 0) {
      sections.push('**Immediate Actions:**');
      result.remediation.immediateActions.forEach((action: any) => {
        sections.push(`- **[${action.priority}]** ${action.action}`);
        sections.push(`  - Reason: ${action.reason}`);
        sections.push(`  - Impact: ${action.estimatedImpact}`);
      });
      sections.push('');
    }

    if (result.remediation.containment) {
      sections.push('**Containment Targets:**');
      if (result.remediation.containment.isolateHosts?.length > 0) {
        sections.push(`- Isolate Hosts: ${result.remediation.containment.isolateHosts.join(', ')}`);
      }
      if (result.remediation.containment.blockIPs?.length > 0) {
        sections.push(`- Block IPs: ${result.remediation.containment.blockIPs.join(', ')}`);
      }
      if (result.remediation.containment.disableAccounts?.length > 0) {
        sections.push(`- Disable Accounts: ${result.remediation.containment.disableAccounts.join(', ')}`);
      }
      sections.push('');
    }

    sections.push(`**Estimated Time:** ${result.remediation.estimatedTime}`);
    sections.push('');
  }

  // Performance Metrics (if available)
  if (result.agentLatencies) {
    sections.push('### ⏱️ Performance Metrics');
    sections.push('');
    const latencies = Object.entries(result.agentLatencies).map(
      ([agent, ms]) => `- ${agent}: ${ms}ms`
    );
    sections.push(latencies.join('\n'));
    sections.push('');
  }

  // Footer
  sections.push('---');
  sections.push(`*Generated by LLM-Powered Alert Investigation (${Object.keys(result.agentLatencies || {}).length} agents, ${result.latencyMs}ms total)*`);

  return sections.join('\n');
};

/**
 * Format triage result summary (concise version for notifications)
 */
export const formatTriageSummary = (triage: TriageResult): string => {
  return `[${triage.classification}] ${triage.attackType} (${triage.confidence}% confidence)`;
};

/**
 * Format MITRE mapping summary (concise version)
 */
export const formatMitreSummary = (mapping: MitreMapping): string => {
  const techniques = mapping.techniques.map((t) => t.id).join(', ');
  return `${mapping.phase} - Techniques: ${techniques}`;
};
