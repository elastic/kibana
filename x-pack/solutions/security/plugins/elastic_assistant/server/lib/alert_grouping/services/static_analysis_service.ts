/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AlertCluster, ExtractedEntity } from '../types';

// ============================================================
// MITRE ATT&CK Tactic ordering and classification rules
// ============================================================

/** MITRE ATT&CK kill chain ordering */
const TACTIC_ORDER: Record<string, number> = {
  Reconnaissance: 0,
  'Resource Development': 1,
  'Initial Access': 2,
  Execution: 3,
  Persistence: 4,
  'Privilege Escalation': 5,
  'Defense Evasion': 6,
  'Credential Access': 7,
  Discovery: 8,
  'Lateral Movement': 9,
  Collection: 10,
  'Command and Control': 11,
  Exfiltration: 12,
  Impact: 13,
};

/**
 * Attack classification rule: a deterministic mapping from tactic/technique
 * distributions to known attack categories.
 */
interface ClassificationRule {
  /** Human-readable label for the attack category */
  label: string;
  /** Minimum number of matching tactics required */
  minTacticMatches: number;
  /** Tactics that must be present (OR - any one is sufficient) */
  requiredTactics?: string[];
  /** Techniques that, if present, strongly signal this category */
  signalTechniques?: string[];
  /** Description template - {host}, {alertCount}, {tactics} are substituted */
  descriptionTemplate: string;
  /** Priority (lower = checked first) */
  priority: number;
}

/**
 * Rule-based attack classification rules, checked in priority order.
 * The first matching rule wins.
 */
const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    label: 'Ransomware / Destructive Attack',
    minTacticMatches: 1,
    requiredTactics: ['Impact'],
    signalTechniques: ['T1486', 'T1490', 'T1491', 'T1529', 'T1561'],
    descriptionTemplate:
      'Destructive activity detected on {host} with {alertCount} alerts spanning {tactics}. ' +
      'Impact-phase techniques suggest ransomware or destructive intent.',
    priority: 0,
  },
  {
    label: 'Data Exfiltration',
    minTacticMatches: 1,
    requiredTactics: ['Exfiltration'],
    signalTechniques: ['T1041', 'T1048', 'T1567', 'T1537'],
    descriptionTemplate:
      'Data exfiltration activity detected on {host} with {alertCount} alerts. ' +
      'Exfiltration techniques indicate data theft.',
    priority: 1,
  },
  {
    label: 'Lateral Movement Campaign',
    minTacticMatches: 1,
    requiredTactics: ['Lateral Movement'],
    signalTechniques: [
      'T1021',
      'T1021.001',
      'T1021.002',
      'T1021.004',
      'T1021.006',
      'T1072',
      'T1080',
      'T1210',
      'T1534',
      'T1550',
      'T1563',
      'T1570',
    ],
    descriptionTemplate:
      'Lateral movement detected from {host} with {alertCount} alerts. ' +
      'Attacker is spreading across the network via remote services.',
    priority: 2,
  },
  {
    label: 'Credential Theft',
    minTacticMatches: 1,
    requiredTactics: ['Credential Access'],
    signalTechniques: ['T1003', 'T1110', 'T1555', 'T1558', 'T1552', 'T1556'],
    descriptionTemplate:
      'Credential access activity detected on {host} with {alertCount} alerts. ' +
      'Techniques suggest credential harvesting or brute force.',
    priority: 3,
  },
  {
    label: 'Command and Control Activity',
    minTacticMatches: 1,
    requiredTactics: ['Command and Control'],
    signalTechniques: ['T1071', 'T1095', 'T1105', 'T1571', 'T1573', 'T1219'],
    descriptionTemplate:
      'C2 communication detected on {host} with {alertCount} alerts. ' +
      'Outbound connections suggest an active command and control channel.',
    priority: 4,
  },
  {
    label: 'Malware Deployment',
    minTacticMatches: 2,
    requiredTactics: ['Execution', 'Persistence', 'Defense Evasion'],
    signalTechniques: ['T1059', 'T1547', 'T1543', 'T1036', 'T1027', 'T1055'],
    descriptionTemplate:
      'Malware deployment detected on {host} with {alertCount} alerts spanning {tactics}. ' +
      'Execution combined with persistence and defense evasion indicates malware installation.',
    priority: 5,
  },
  {
    label: 'Privilege Escalation Attempt',
    minTacticMatches: 1,
    requiredTactics: ['Privilege Escalation'],
    signalTechniques: ['T1068', 'T1548', 'T1134', 'T1078'],
    descriptionTemplate:
      'Privilege escalation detected on {host} with {alertCount} alerts. ' +
      'Attacker is attempting to gain elevated permissions.',
    priority: 6,
  },
  {
    label: 'Reconnaissance & Discovery',
    minTacticMatches: 1,
    requiredTactics: ['Discovery', 'Reconnaissance'],
    signalTechniques: ['T1087', 'T1082', 'T1083', 'T1046', 'T1135'],
    descriptionTemplate:
      'Reconnaissance and discovery activity on {host} with {alertCount} alerts. ' +
      'Attacker is enumerating systems, users, and network resources.',
    priority: 7,
  },
  {
    label: 'Defense Evasion',
    minTacticMatches: 1,
    requiredTactics: ['Defense Evasion'],
    signalTechniques: ['T1070', 'T1036', 'T1027', 'T1562', 'T1140'],
    descriptionTemplate:
      'Defense evasion activity on {host} with {alertCount} alerts. ' +
      'Techniques indicate attempts to avoid detection.',
    priority: 8,
  },
  {
    label: 'Suspicious Execution',
    minTacticMatches: 1,
    requiredTactics: ['Execution'],
    signalTechniques: ['T1059', 'T1053', 'T1569', 'T1204'],
    descriptionTemplate:
      'Suspicious execution activity on {host} with {alertCount} alerts. ' +
      'Multiple execution techniques detected.',
    priority: 9,
  },
];

// ============================================================
// Static Attack Summary
// ============================================================

/**
 * A static (non-LLM) attack summary generated from cluster metadata.
 */
export interface StaticAttackSummary {
  /** Short title for the attack */
  title: string;
  /** Multi-line structured description */
  description: string;
  /** Classification label (e.g., "Lateral Movement Campaign") */
  classification: string;
  /** Severity derived from tactic progression */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Ordered kill chain stages observed */
  killChain: string[];
  /** Key MITRE techniques */
  techniques: string[];
  /** Top detection rules by frequency */
  topRules: Array<{ name: string; count: number }>;
  /** Entity summary counts */
  entitySummary: Record<string, number>;
}

// ============================================================
// Deterministic Case Similarity
// ============================================================

/**
 * Result of a deterministic similarity comparison between two cases/clusters.
 */
export interface DeterministicSimilarityResult {
  /** Overall similarity score (0-1) */
  similarity: number;
  /** Whether these cases should be merged */
  shouldMerge: boolean;
  /** Human-readable explanation */
  reason: string;
  /** Breakdown of individual similarity components */
  breakdown: {
    entityOverlap: number;
    techniqueOverlap: number;
    ruleOverlap: number;
    temporalProximity: number;
  };
}

/**
 * Data needed to compare a case for similarity.
 */
export interface CaseSimilarityInput {
  /** Case ID */
  caseId: string;
  /** Case title */
  caseTitle: string;
  /** Entity values grouped by type */
  entities: ExtractedEntity[];
  /** MITRE techniques observed */
  techniques: string[];
  /** Detection rule names */
  ruleNames: string[];
  /** Earliest alert timestamp */
  earliestTimestamp: string;
  /** Latest alert timestamp */
  latestTimestamp: string;
  /** Host names */
  hostNames: string[];
}

// ============================================================
// Service Implementation
// ============================================================

/**
 * StaticAnalysisService provides deterministic replacements for LLM-based
 * analysis in the alert grouping pipeline.
 *
 * It offers three capabilities:
 * 1. **Static Attack Summary** - Template-based case descriptions from cluster metadata
 * 2. **Rule-Based Classification** - MITRE tactic distributions → attack category labels
 * 3. **Deterministic Similarity** - Weighted Jaccard overlap for case merging
 */
export class StaticAnalysisService {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  // ============================================================
  // 1. Rule-Based Cluster Classification
  // ============================================================

  /**
   * Classify an alert cluster using deterministic rules based on MITRE tactic
   * and technique distributions. Returns a label and description without LLM.
   */
  classifyCluster(cluster: AlertCluster): {
    classification: string;
    description: string;
  } {
    const { tactics, techniques, hostName, alertIds } = cluster;
    const tacticSet = new Set(tactics);
    const techniqueSet = new Set(techniques);

    for (const rule of CLASSIFICATION_RULES) {
      if (!rule.requiredTactics) continue;

      // Count how many required tactics are present
      const matchingTactics = rule.requiredTactics.filter((t) => tacticSet.has(t));
      if (matchingTactics.length < rule.minTacticMatches) continue;

      // Check signal techniques for stronger confidence
      const matchingTechniques = (rule.signalTechniques ?? []).filter((t) => techniqueSet.has(t));

      // If we have tactic match, classify
      const orderedTactics = this.orderTactics(tactics);
      const description = rule.descriptionTemplate
        .replace('{host}', hostName)
        .replace('{alertCount}', String(alertIds.length))
        .replace('{tactics}', orderedTactics.join(' → '));

      this.logger.debug(
        `Cluster ${cluster.id} classified as "${rule.label}" ` +
          `(tactics: ${matchingTactics.join(', ')}, techniques: ${
            matchingTechniques.length
          } signal matches)`
      );

      return { classification: rule.label, description };
    }

    // Fallback: use the dominant tactic
    if (tactics.length > 0) {
      const orderedTactics = this.orderTactics(tactics);
      return {
        classification: `${orderedTactics[0]} Activity`,
        description:
          `Security activity detected on ${hostName} with ${alertIds.length} alerts ` +
          `spanning ${orderedTactics.join(' → ')}.`,
      };
    }

    return {
      classification: 'Unclassified Alert Cluster',
      description:
        `${alertIds.length} alerts detected on ${hostName}. ` +
        `No specific MITRE tactics identified for automatic classification.`,
    };
  }

  // ============================================================
  // 2. Static Attack Summary Generation
  // ============================================================

  /**
   * Generate a structured attack summary from cluster metadata without using an LLM.
   * Produces actionable, human-readable output for SOC analysts.
   */
  generateAttackSummary(
    cluster: AlertCluster,
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): StaticAttackSummary {
    const { classification, description } = this.classifyCluster(cluster);
    const orderedTactics = this.orderTactics(cluster.tactics);
    const severity = this.deriveSeverity(cluster);
    const topRules = this.extractTopRules(alerts);
    const entitySummary = this.summarizeEntities(cluster.entities);

    const title = this.formatSummaryTitle(cluster, classification);
    const fullDescription = this.formatFullDescription(
      cluster,
      classification,
      description,
      orderedTactics,
      topRules,
      entitySummary
    );

    return {
      title,
      description: fullDescription,
      classification,
      severity,
      killChain: orderedTactics,
      techniques: cluster.techniques,
      topRules,
      entitySummary,
    };
  }

  // ============================================================
  // 3. Deterministic Case Similarity
  // ============================================================

  /**
   * Compute deterministic similarity between two cases using weighted
   * Jaccard overlap across multiple dimensions.
   *
   * Weights:
   * - Entity overlap (shared IPs, hosts, users, hashes): 40%
   * - MITRE technique overlap: 25%
   * - Detection rule overlap: 20%
   * - Temporal proximity: 15%
   */
  computeCaseSimilarity(
    case1: CaseSimilarityInput,
    case2: CaseSimilarityInput,
    mergeThreshold = 0.7
  ): DeterministicSimilarityResult {
    const entityOverlap = this.computeEntityOverlap(case1.entities, case2.entities);
    const techniqueOverlap = this.jaccard(new Set(case1.techniques), new Set(case2.techniques));
    const ruleOverlap = this.jaccard(new Set(case1.ruleNames), new Set(case2.ruleNames));
    const temporalProximity = this.computeTemporalProximity(
      case1.earliestTimestamp,
      case1.latestTimestamp,
      case2.earliestTimestamp,
      case2.latestTimestamp
    );

    const similarity =
      entityOverlap * 0.4 + techniqueOverlap * 0.25 + ruleOverlap * 0.2 + temporalProximity * 0.15;

    const shouldMerge = similarity >= mergeThreshold;

    // Build explanation
    const parts: string[] = [];
    if (entityOverlap > 0.3) {
      parts.push(`shared entities (${(entityOverlap * 100).toFixed(0)}% overlap)`);
    }
    if (techniqueOverlap > 0.3) {
      parts.push(`similar MITRE techniques (${(techniqueOverlap * 100).toFixed(0)}% overlap)`);
    }
    if (ruleOverlap > 0.3) {
      parts.push(`same detection rules (${(ruleOverlap * 100).toFixed(0)}% overlap)`);
    }
    if (temporalProximity > 0.5) {
      parts.push('close temporal proximity');
    }

    const reason = shouldMerge
      ? `Cases should be merged: ${parts.join(', ')}. Overall similarity: ${(
          similarity * 100
        ).toFixed(1)}%.`
      : `Cases are distinct (similarity: ${(similarity * 100).toFixed(1)}%). ` +
        `Strongest signal: ${parts[0] ?? 'none above threshold'}.`;

    this.logger.debug(
      `Similarity between "${case1.caseTitle}" and "${case2.caseTitle}": ` +
        `${(similarity * 100).toFixed(1)}% ` +
        `(entity=${(entityOverlap * 100).toFixed(0)}%, ` +
        `technique=${(techniqueOverlap * 100).toFixed(0)}%, ` +
        `rule=${(ruleOverlap * 100).toFixed(0)}%, ` +
        `temporal=${(temporalProximity * 100).toFixed(0)}%)`
    );

    return {
      similarity,
      shouldMerge,
      reason,
      breakdown: { entityOverlap, techniqueOverlap, ruleOverlap, temporalProximity },
    };
  }

  /**
   * Build CaseSimilarityInput from an AlertCluster and its alerts.
   */
  buildSimilarityInput(
    caseId: string,
    caseTitle: string,
    cluster: AlertCluster,
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): CaseSimilarityInput {
    const ruleNames = [
      ...new Set(alerts.map((a) => a._source['kibana.alert.rule.name'] as string).filter(Boolean)),
    ];

    return {
      caseId,
      caseTitle,
      entities: cluster.entities,
      techniques: cluster.techniques,
      ruleNames,
      earliestTimestamp: cluster.earliestTimestamp,
      latestTimestamp: cluster.latestTimestamp,
      hostNames: [cluster.hostName],
    };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /** Order tactics by MITRE kill chain position */
  private orderTactics(tactics: string[]): string[] {
    return [...new Set(tactics)].sort((a, b) => (TACTIC_ORDER[a] ?? 99) - (TACTIC_ORDER[b] ?? 99));
  }

  /** Derive case severity from cluster metadata */
  private deriveSeverity(cluster: AlertCluster): 'low' | 'medium' | 'high' | 'critical' {
    const tacticSet = new Set(cluster.tactics);

    // Critical: Impact or Exfiltration tactics present
    if (tacticSet.has('Impact') || tacticSet.has('Exfiltration')) {
      return 'critical';
    }

    // High: Lateral Movement, C2, or Credential Access present
    if (
      tacticSet.has('Lateral Movement') ||
      tacticSet.has('Command and Control') ||
      tacticSet.has('Credential Access')
    ) {
      return 'high';
    }

    // Medium: Multiple tactics (full kill chain progression)
    if (cluster.tactics.length >= 3) {
      return 'medium';
    }

    // Low: Single tactic or few alerts
    return 'low';
  }

  /** Extract top detection rules from alerts, sorted by frequency */
  private extractTopRules(
    alerts: Array<{ _id: string; _source: Record<string, unknown> }>
  ): Array<{ name: string; count: number }> {
    const ruleCounts = new Map<string, number>();
    for (const alert of alerts) {
      const ruleName = alert._source['kibana.alert.rule.name'] as string;
      if (ruleName) {
        ruleCounts.set(ruleName, (ruleCounts.get(ruleName) ?? 0) + 1);
      }
    }

    return Array.from(ruleCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /** Count entities by type */
  private summarizeEntities(entities: ExtractedEntity[]): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const entity of entities) {
      const typeLabel = entity.type.replace('observable-type-', '');
      summary[typeLabel] = (summary[typeLabel] ?? 0) + 1;
    }
    return summary;
  }

  /** Format a case title from cluster metadata and classification */
  private formatSummaryTitle(cluster: AlertCluster, classification: string): string {
    return `${classification} on ${cluster.hostName} (${cluster.alertIds.length} alerts)`;
  }

  /** Build a full multi-section case description */
  private formatFullDescription(
    cluster: AlertCluster,
    classification: string,
    classificationDescription: string,
    orderedTactics: string[],
    topRules: Array<{ name: string; count: number }>,
    entitySummary: Record<string, number>
  ): string {
    const lines: string[] = [
      `**Automatically grouped by alert clustering pipeline**`,
      '',
      `**Classification**: ${classification}`,
      classificationDescription,
      '',
      `**Host**: ${cluster.hostName}`,
      `**Alert Count**: ${cluster.alertIds.length}`,
      `**Time Range**: ${cluster.earliestTimestamp} to ${cluster.latestTimestamp}`,
    ];

    if (orderedTactics.length > 0) {
      lines.push(`**Kill Chain**: ${orderedTactics.join(' → ')}`);
    }

    if (cluster.techniques.length > 0) {
      lines.push(`**Techniques**: ${cluster.techniques.slice(0, 15).join(', ')}`);
    }

    // Top rules
    if (topRules.length > 0) {
      lines.push('', '**Top Detection Rules**:');
      for (const rule of topRules.slice(0, 5)) {
        lines.push(`- ${rule.name} (${rule.count} alerts)`);
      }
    }

    // Key processes
    if (cluster.processTrees.length > 0) {
      const keyProcesses = cluster.processTrees
        .filter((p) => p.alertIds.length >= 2)
        .sort((a, b) => b.alertIds.length - a.alertIds.length)
        .slice(0, 5);

      if (keyProcesses.length > 0) {
        lines.push('', '**Key Processes**:');
        for (const proc of keyProcesses) {
          const parent = proc.parentName ? ` (parent: ${proc.parentName})` : '';
          lines.push(`- ${proc.executable}${parent} — ${proc.alertIds.length} alerts`);
        }
      }
    }

    // Entity summary
    const entityEntries = Object.entries(entitySummary).filter(([, count]) => count > 0);
    if (entityEntries.length > 0) {
      lines.push(
        '',
        `**Entities**: ${entityEntries.map(([type, count]) => `${count} ${type}`).join(', ')}`
      );
    }

    // Cross-host links
    if (cluster.crossHostLinks.length > 0) {
      lines.push('', '**Cross-Host Links**:');
      for (const link of cluster.crossHostLinks) {
        lines.push(
          `- ${link.sourceHost} ↔ ${link.targetHost}: ${link.description} (confidence: ${(
            link.confidence * 100
          ).toFixed(0)}%)`
        );
      }
    }

    lines.push('', `**Cluster Confidence**: ${(cluster.confidence * 100).toFixed(0)}%`);

    return lines.join('\n');
  }

  /** Compute weighted entity overlap between two entity sets */
  private computeEntityOverlap(entities1: ExtractedEntity[], entities2: ExtractedEntity[]): number {
    const set1 = new Set(entities1.map((e) => `${e.type}:${e.normalizedValue}`));
    const set2 = new Set(entities2.map((e) => `${e.type}:${e.normalizedValue}`));

    return this.jaccard(set1, set2);
  }

  /** Jaccard similarity index: |A ∩ B| / |A ∪ B| */
  private jaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Compute temporal proximity between two time ranges.
   * Returns 1.0 for overlapping ranges, decaying to 0 for ranges > 24h apart.
   */
  private computeTemporalProximity(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): number {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();

    // Check for any NaN
    if ([s1, e1, s2, e2].some(isNaN)) return 0;

    // Check overlap
    if (s1 <= e2 && s2 <= e1) {
      return 1.0; // Overlapping
    }

    // Compute gap between ranges
    const gap = Math.min(Math.abs(s1 - e2), Math.abs(s2 - e1));
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    // Exponential decay: 0.5 at 4h, ~0 at 24h
    return Math.max(0, Math.exp(-gap / (twentyFourHoursMs / 6)));
  }
}
