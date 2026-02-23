/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { get } from 'lodash/fp';

import type {
  GroupingConfig,
  ExtractedEntity,
  AlertCluster,
  CrossHostLink,
  ClusteringResult,
  ProcessNode,
} from '../types';
import { EntityExtractionService } from './entity_extraction_service';

/** Default lateral movement MITRE technique IDs */
const DEFAULT_LATERAL_MOVEMENT_TECHNIQUES = [
  'T1021', // Remote Services
  'T1021.001', // Remote Desktop Protocol
  'T1021.002', // SMB/Windows Admin Shares
  'T1021.004', // SSH
  'T1021.006', // Windows Remote Management
  'T1072', // Software Deployment Tools
  'T1080', // Taint Shared Content
  'T1091', // Replication Through Removable Media
  'T1210', // Exploitation of Remote Services
  'T1534', // Internal Spearphishing
  'T1550', // Use Alternate Authentication Material
  'T1563', // Remote Service Session Hijacking
  'T1570', // Lateral Tool Transfer
];

/** MITRE ATT&CK kill chain ordering for tactic sub-grouping */
const TACTIC_KILL_CHAIN_ORDER: Record<string, number> = {
  'Reconnaissance': 0,
  'Resource Development': 1,
  'Initial Access': 2,
  'Execution': 3,
  'Persistence': 4,
  'Privilege Escalation': 5,
  'Defense Evasion': 6,
  'Credential Access': 7,
  'Discovery': 8,
  'Lateral Movement': 9,
  'Collection': 10,
  'Command and Control': 11,
  'Exfiltration': 12,
  'Impact': 13,
};

interface AlertWithMetadata {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
  hostName: string;
  timestamp: string;
  tactics: string[];
  techniques: string[];
  entities: ExtractedEntity[];
  processNode?: ProcessNode;
}

/**
 * Service for multi-stage alert clustering.
 *
 * Implements a pipeline that progressively refines alert groupings:
 *   Stage 1 (Tier 1): Host-primary grouping - buckets alerts by host.name
 *   Stage 2 (Tier 2): Temporal clustering - splits host buckets by time gaps
 *   Stage 3 (Tier 2): Tactic chain sub-grouping - annotates clusters with kill chain data
 *   Stage 4 (Tier 2): Process tree correlation - merges clusters sharing process ancestry
 *   Stage 5 (Tier 3): Cross-host correlation - links clusters across hosts
 */
export class AlertClusteringService {
  private readonly logger: Logger;
  private readonly config: GroupingConfig;
  private readonly entityService: EntityExtractionService;

  constructor({
    logger,
    config,
    entityService,
  }: {
    logger: Logger;
    config: GroupingConfig;
    entityService: EntityExtractionService;
  }) {
    this.logger = logger;
    this.config = config;
    this.entityService = entityService;
  }

  /**
   * Run the full clustering pipeline on a set of alerts.
   */
  public clusterAlerts(
    alerts: Array<{ _id: string; _index: string; _source: Record<string, unknown> }>,
    alertEntities: Map<string, ExtractedEntity[]>
  ): ClusteringResult {
    const metrics = {
      totalAlerts: alerts.length,
      uniqueHosts: 0,
      clustersCreated: 0,
      temporalSplits: 0,
      tacticSubGroups: 0,
      processTreeCorrelations: 0,
      crossHostLinksFound: 0,
    };

    if (alerts.length === 0) {
      return { clusters: [], crossHostLinks: [], metrics };
    }

    // Enrich alerts with metadata
    const enrichedAlerts = this.enrichAlerts(alerts, alertEntities);

    // Stage 1: Host-primary grouping
    const hostGroups = this.groupByHost(enrichedAlerts);
    metrics.uniqueHosts = hostGroups.size;
    this.logger.debug(`Stage 1: Grouped ${alerts.length} alerts into ${hostGroups.size} host groups`);

    // Stage 2: Temporal clustering within each host group
    let clusters = this.temporalClustering(hostGroups);
    metrics.temporalSplits = clusters.length - hostGroups.size;
    this.logger.debug(
      `Stage 2: Temporal clustering produced ${clusters.length} clusters (${metrics.temporalSplits} splits)`
    );

    // Stage 3: Tactic chain annotation and sub-grouping
    clusters = this.tacticChainSubGrouping(clusters, enrichedAlerts);
    metrics.tacticSubGroups = clusters.length - hostGroups.size - metrics.temporalSplits;
    this.logger.debug(
      `Stage 3: Tactic sub-grouping produced ${clusters.length} clusters`
    );

    // Stage 4: Process tree correlation
    const processCorrelations = this.processTreeCorrelation(clusters, enrichedAlerts);
    metrics.processTreeCorrelations = processCorrelations;
    this.logger.debug(
      `Stage 4: Found ${processCorrelations} process tree correlations`
    );

    // Stage 5: Cross-host correlation
    const crossHostLinks = this.crossHostCorrelation(clusters, enrichedAlerts);
    metrics.crossHostLinksFound = crossHostLinks.length;
    this.logger.debug(
      `Stage 5: Found ${crossHostLinks.length} cross-host links`
    );

    // Attach cross-host links to relevant clusters
    for (const link of crossHostLinks) {
      for (const cluster of clusters) {
        if (cluster.hostName === link.sourceHost || cluster.hostName === link.targetHost) {
          const hasLink = cluster.crossHostLinks.some(
            (l) => l.sourceHost === link.sourceHost && l.targetHost === link.targetHost
          );
          if (!hasLink) {
            cluster.crossHostLinks.push(link);
          }
        }
      }
    }

    metrics.clustersCreated = clusters.length;

    this.logger.info(
      `Clustering pipeline complete: ${alerts.length} alerts → ${clusters.length} clusters ` +
        `across ${metrics.uniqueHosts} hosts, ${crossHostLinks.length} cross-host links`
    );

    return { clusters, crossHostLinks, metrics };
  }

  /**
   * Enrich alerts with extracted metadata for the clustering pipeline.
   */
  private enrichAlerts(
    alerts: Array<{ _id: string; _index: string; _source: Record<string, unknown> }>,
    alertEntities: Map<string, ExtractedEntity[]>
  ): AlertWithMetadata[] {
    const mitreMetadata = this.entityService.extractMitreMetadata(alerts);
    const processTrees = this.entityService.extractProcessTrees(alerts);
    const processNodeByAlertId = new Map<string, ProcessNode>();
    for (const node of processTrees) {
      for (const alertId of node.alertIds) {
        processNodeByAlertId.set(alertId, node);
      }
    }

    return alerts.map((alert) => {
      const source = alert._source;
      const hostName = (get('host.name', source) as string | undefined) ?? 'unknown';
      const timestamp = (get('@timestamp', source) as string | undefined) ?? new Date().toISOString();
      const mitre = mitreMetadata.get(alert._id) ?? { tactics: [], techniques: [] };
      const entities = alertEntities.get(alert._id) ?? [];
      const processNode = processNodeByAlertId.get(alert._id);

      return {
        _id: alert._id,
        _index: alert._index,
        _source: source,
        hostName: hostName.toLowerCase(),
        timestamp,
        tactics: mitre.tactics,
        techniques: mitre.techniques,
        entities,
        processNode,
      };
    });
  }

  // ============================================================
  // Stage 1: Host-primary grouping (Tier 1)
  // ============================================================

  /**
   * Group alerts by host.name as the primary dimension.
   * This prevents cross-host contamination from shared generic entities.
   */
  private groupByHost(alerts: AlertWithMetadata[]): Map<string, AlertWithMetadata[]> {
    const groups = new Map<string, AlertWithMetadata[]>();

    for (const alert of alerts) {
      const hostKey = alert.hostName;
      const existing = groups.get(hostKey) ?? [];
      existing.push(alert);
      groups.set(hostKey, existing);
    }

    return groups;
  }

  // ============================================================
  // Stage 2: Temporal clustering (Tier 2)
  // ============================================================

  /**
   * Within each host group, split alerts into temporal clusters based on time gaps.
   * If two consecutive alerts have a gap larger than the threshold, they start a new cluster.
   */
  private temporalClustering(hostGroups: Map<string, AlertWithMetadata[]>): AlertCluster[] {
    const config = this.config.temporalClustering;
    const enabled = config?.enabled !== false; // Default: enabled
    const gapThresholdMs = (config?.gapThresholdMinutes ?? 60) * 60 * 1000;
    const minClusterSize = config?.minClusterSize ?? 5;

    const clusters: AlertCluster[] = [];
    let clusterCounter = 0;

    for (const [hostName, alerts] of hostGroups) {
      if (!enabled || alerts.length <= 1) {
        // No temporal clustering: one cluster per host
        clusters.push(this.createCluster(++clusterCounter, hostName, alerts));
        continue;
      }

      // Sort alerts by timestamp
      const sorted = [...alerts].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const temporalGroups: AlertWithMetadata[][] = [];
      let currentGroup: AlertWithMetadata[] = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const prevTime = new Date(sorted[i - 1].timestamp).getTime();
        const currTime = new Date(sorted[i].timestamp).getTime();
        const gap = currTime - prevTime;

        if (gap > gapThresholdMs) {
          temporalGroups.push(currentGroup);
          currentGroup = [sorted[i]];
        } else {
          currentGroup.push(sorted[i]);
        }
      }
      temporalGroups.push(currentGroup);

      // Merge small clusters with their nearest neighbor
      const mergedGroups = this.mergeSmallClusters(temporalGroups, minClusterSize);

      for (const group of mergedGroups) {
        clusters.push(this.createCluster(++clusterCounter, hostName, group));
      }
    }

    return clusters;
  }

  /**
   * Merge clusters smaller than minSize with their nearest temporal neighbor.
   */
  private mergeSmallClusters(
    groups: AlertWithMetadata[][],
    minSize: number
  ): AlertWithMetadata[][] {
    if (groups.length <= 1) {
      return groups;
    }

    const result: AlertWithMetadata[][] = [];
    let pending: AlertWithMetadata[] | null = null;

    for (const group of groups) {
      if (pending) {
        if (group.length < minSize) {
          // Both are small, merge together
          pending.push(...group);
        } else {
          // Current group is large enough, merge pending into it
          result.push([...pending, ...group]);
          pending = null;
        }
      } else if (group.length < minSize) {
        pending = [...group];
      } else {
        result.push(group);
      }
    }

    if (pending) {
      if (result.length > 0) {
        // Merge with the last cluster
        result[result.length - 1].push(...pending);
      } else {
        result.push(pending);
      }
    }

    return result;
  }

  // ============================================================
  // Stage 3: Tactic chain sub-grouping (Tier 2)
  // ============================================================

  /**
   * Within each temporal cluster, annotate with MITRE tactic progression
   * and optionally split clusters that contain distinctly different kill chain phases.
   */
  private tacticChainSubGrouping(
    clusters: AlertCluster[],
    enrichedAlerts: AlertWithMetadata[]
  ): AlertCluster[] {
    const alertLookup = new Map<string, AlertWithMetadata>();
    for (const alert of enrichedAlerts) {
      alertLookup.set(alert._id, alert);
    }

    const result: AlertCluster[] = [];
    let subClusterCounter = 0;

    for (const cluster of clusters) {
      // Collect tactic info for all alerts in this cluster
      const alertsWithTactics = cluster.alertIds
        .map((id) => alertLookup.get(id))
        .filter((a): a is AlertWithMetadata => a !== undefined);

      // Annotate the cluster with aggregate tactic/technique information
      const allTactics = new Set<string>();
      const allTechniques = new Set<string>();
      for (const alert of alertsWithTactics) {
        for (const tactic of alert.tactics) allTactics.add(tactic);
        for (const technique of alert.techniques) allTechniques.add(technique);
      }
      cluster.tactics = [...allTactics];
      cluster.techniques = [...allTechniques];

      // Build tactic chain description
      const orderedTactics = [...allTactics].sort(
        (a, b) => (TACTIC_KILL_CHAIN_ORDER[a] ?? 99) - (TACTIC_KILL_CHAIN_ORDER[b] ?? 99)
      );
      cluster.description =
        `${cluster.hostName}: ${cluster.alertIds.length} alerts, ` +
        `tactics: ${orderedTactics.join(' → ')}, ` +
        `${cluster.earliestTimestamp} to ${cluster.latestTimestamp}`;

      // Tactic-based splitting is disabled by default because most attack operations
      // (e.g., Caldera operations, APT campaigns) span the full kill chain.
      // Splitting by tactic phase would break the operation-level grouping.
      // Enable via config.tacticSubGrouping.enabled = true for environments where
      // alerts on a single host represent truly independent operations.
      const tacticSplitEnabled = this.config.tacticSubGrouping?.enabled === true;
      if (tacticSplitEnabled && alertsWithTactics.length > 200 && allTactics.size >= 8) {
        const subClusters = this.splitByTacticPhase(cluster, alertsWithTactics);
        if (subClusters.length > 1 && subClusters.every((s) => s.alertIds.length >= 30)) {
          for (const sub of subClusters) {
            sub.id = `${cluster.id}-sub-${++subClusterCounter}`;
            result.push(sub);
          }
          continue;
        }
      }

      result.push(cluster);
    }

    return result;
  }

  /**
   * Split a large cluster into sub-clusters based on MITRE kill chain phase groupings.
   * Groups tactics into early-stage (Recon→Execution), mid-stage (Persistence→Discovery),
   * and late-stage (Lateral Movement→Impact).
   */
  private splitByTacticPhase(
    cluster: AlertCluster,
    alerts: AlertWithMetadata[]
  ): AlertCluster[] {
    const earlyStage: AlertWithMetadata[] = []; // Kill chain positions 0-3
    const midStage: AlertWithMetadata[] = []; // Kill chain positions 4-8
    const lateStage: AlertWithMetadata[] = []; // Kill chain positions 9-13

    for (const alert of alerts) {
      const maxPhase = Math.max(
        ...alert.tactics.map((t) => TACTIC_KILL_CHAIN_ORDER[t] ?? 6)
      );

      if (maxPhase <= 3) {
        earlyStage.push(alert);
      } else if (maxPhase <= 8) {
        midStage.push(alert);
      } else {
        lateStage.push(alert);
      }
    }

    const phases = [
      { label: 'early', alerts: earlyStage },
      { label: 'mid', alerts: midStage },
      { label: 'late', alerts: lateStage },
    ].filter((p) => p.alerts.length > 0);

    // Only split if we have at least 2 non-trivial phases
    if (phases.length < 2 || phases.every((p) => p.alerts.length < 5)) {
      return [cluster];
    }

    let counter = 0;
    return phases.map((phase) => {
      const subCluster = this.createCluster(
        counter++,
        cluster.hostName,
        phase.alerts
      );
      subCluster.id = `${cluster.id}-${phase.label}`;
      return subCluster;
    });
  }

  // ============================================================
  // Stage 4: Process tree correlation (Tier 2)
  // ============================================================

  /**
   * Correlate alerts within clusters by process tree ancestry.
   * Alerts sharing a common unusual parent process are strengthened as a group.
   * Returns the number of correlations found.
   */
  private processTreeCorrelation(
    clusters: AlertCluster[],
    enrichedAlerts: AlertWithMetadata[]
  ): number {
    const processTreeEnabled = this.config.processTree?.enabled !== false;
    if (!processTreeEnabled) {
      return 0;
    }

    const excludedProcesses = new Set(
      (this.config.processTree?.excludedProcesses ?? [
        'bash', 'sh', 'dash', 'zsh', 'fish', 'cmd.exe', 'powershell.exe',
        'sshd', 'systemd', 'init', 'launchd',
      ]).map((p) => p.toLowerCase())
    );

    let correlations = 0;

    for (const cluster of clusters) {
      const clusterAlerts = enrichedAlerts.filter((a) => cluster.alertIds.includes(a._id));

      // Group by parent executable (non-generic parents only)
      const parentGroups = new Map<string, string[]>();
      for (const alert of clusterAlerts) {
        const parentExe = alert.processNode?.parentExecutable?.toLowerCase();
        const parentName = alert.processNode?.parentName?.toLowerCase();
        const parent = parentExe ?? parentName;

        if (parent && !excludedProcesses.has(parent) && !excludedProcesses.has(parentName ?? '')) {
          const existing = parentGroups.get(parent) ?? [];
          existing.push(alert._id);
          parentGroups.set(parent, existing);
        }
      }

      // Record process trees in the cluster
      const processTrees: ProcessNode[] = [];
      for (const [parentKey, alertIds] of parentGroups) {
        if (alertIds.length >= 2) {
          correlations++;
          processTrees.push({
            name: '',
            executable: parentKey,
            alertIds,
          });
        }
      }
      cluster.processTrees = processTrees;
    }

    return correlations;
  }

  // ============================================================
  // Stage 5: Cross-host correlation (Tier 3)
  // ============================================================

  /**
   * Find relationships between clusters on different hosts that indicate
   * lateral movement or coordinated attack activity.
   */
  private crossHostCorrelation(
    clusters: AlertCluster[],
    enrichedAlerts: AlertWithMetadata[]
  ): CrossHostLink[] {
    const crossHostConfig = this.config.crossHostCorrelation;
    if (crossHostConfig?.enabled === false) {
      return [];
    }

    const timeWindowMs = (crossHostConfig?.timeWindowMinutes ?? 5) * 60 * 1000;
    const minConfidence = crossHostConfig?.minConfidence ?? 0.4;
    const lateralTechniques = new Set(
      crossHostConfig?.lateralMovementTechniques ?? DEFAULT_LATERAL_MOVEMENT_TECHNIQUES
    );

    const links: CrossHostLink[] = [];
    const alertLookup = new Map<string, AlertWithMetadata>();
    for (const alert of enrichedAlerts) {
      alertLookup.set(alert._id, alert);
    }

    // Method 1: Lateral movement rule detection
    // Find alerts with lateral movement techniques across different hosts
    const lateralAlerts = enrichedAlerts.filter((a) =>
      a.techniques.some((t) => lateralTechniques.has(t))
    );

    const lateralByHost = new Map<string, AlertWithMetadata[]>();
    for (const alert of lateralAlerts) {
      const existing = lateralByHost.get(alert.hostName) ?? [];
      existing.push(alert);
      lateralByHost.set(alert.hostName, existing);
    }

    // If multiple hosts have lateral movement alerts at similar times, link them
    const lateralHosts = [...lateralByHost.keys()];
    for (let i = 0; i < lateralHosts.length; i++) {
      for (let j = i + 1; j < lateralHosts.length; j++) {
        const alertsA = lateralByHost.get(lateralHosts[i])!;
        const alertsB = lateralByHost.get(lateralHosts[j])!;

        const temporalMatches = this.findTemporalMatches(alertsA, alertsB, timeWindowMs);
        if (temporalMatches.length > 0) {
          links.push({
            sourceHost: lateralHosts[i],
            targetHost: lateralHosts[j],
            linkType: 'lateral_movement_rule',
            confidence: Math.min(0.9, 0.5 + temporalMatches.length * 0.1),
            alertIds: temporalMatches.flatMap(([a, b]) => [a._id, b._id]),
            description:
              `Lateral movement techniques detected on both hosts within ${crossHostConfig?.timeWindowMinutes ?? 5}min: ` +
              `${temporalMatches.length} temporal matches`,
          });
        }
      }
    }

    // Method 2: Same rule triggering at same time on a SMALL subset of hosts.
    // If the same rule fires on many hosts (>50%), it's likely the same playbook
    // running everywhere (e.g., Caldera operations) — not meaningful coordination.
    // Only link when a rule fires on 2-3 hosts in the same time bucket, which
    // suggests actual lateral movement or targeted coordinated activity.
    const uniqueHostCount = new Set(enrichedAlerts.map((a) => a.hostName)).size;
    const maxHostsForCorrelation = Math.max(3, Math.ceil(uniqueHostCount * 0.3));

    const alertsByRuleAndTime = new Map<string, AlertWithMetadata[]>();
    for (const alert of enrichedAlerts) {
      const ruleName = get('kibana.alert.rule.name', alert._source) as string | undefined;
      if (!ruleName) continue;

      // Round timestamp to 2-minute buckets for matching
      const timeBucket = Math.floor(new Date(alert.timestamp).getTime() / (2 * 60 * 1000));
      const key = `${ruleName}:${timeBucket}`;
      const existing = alertsByRuleAndTime.get(key) ?? [];
      existing.push(alert);
      alertsByRuleAndTime.set(key, existing);
    }

    for (const [_key, groupAlerts] of alertsByRuleAndTime) {
      const hosts = new Set(groupAlerts.map((a) => a.hostName));
      // Only link if 2-3 hosts share the rule (targeted), not if it's widespread
      if (hosts.size >= 2 && hosts.size <= maxHostsForCorrelation) {
        const hostList = [...hosts];
        for (let i = 0; i < hostList.length; i++) {
          for (let j = i + 1; j < hostList.length; j++) {
            const existingLink = links.find(
              (l) =>
                (l.sourceHost === hostList[i] && l.targetHost === hostList[j]) ||
                (l.sourceHost === hostList[j] && l.targetHost === hostList[i])
            );
            if (!existingLink) {
              links.push({
                sourceHost: hostList[i],
                targetHost: hostList[j],
                linkType: 'temporal_tactic_match',
                confidence: Math.min(0.7, 0.3 + hosts.size * 0.05),
                alertIds: groupAlerts.map((a) => a._id),
                description:
                  `Same detection rule triggered simultaneously on ${hosts.size} hosts (selective correlation)`,
              });
            }
          }
        }
      }
    }

    // Method 3: Network connection data (if available)
    if (crossHostConfig?.useNetworkData !== false) {
      const networkLinks = this.findNetworkLinks(enrichedAlerts, clusters);
      links.push(...networkLinks);
    }

    // Filter by minimum confidence
    return links.filter((l) => l.confidence >= minConfidence);
  }

  /**
   * Find temporal matches between two sets of alerts (alerts occurring within timeWindowMs).
   */
  private findTemporalMatches(
    alertsA: AlertWithMetadata[],
    alertsB: AlertWithMetadata[],
    timeWindowMs: number
  ): Array<[AlertWithMetadata, AlertWithMetadata]> {
    const matches: Array<[AlertWithMetadata, AlertWithMetadata]> = [];

    for (const a of alertsA) {
      const aTime = new Date(a.timestamp).getTime();
      for (const b of alertsB) {
        const bTime = new Date(b.timestamp).getTime();
        if (Math.abs(aTime - bTime) <= timeWindowMs) {
          matches.push([a, b]);
          break; // One match per alert from A
        }
      }
    }

    return matches;
  }

  /**
   * Find network-based links between hosts using source/destination IP correlation.
   */
  private findNetworkLinks(
    alerts: AlertWithMetadata[],
    clusters: AlertCluster[]
  ): CrossHostLink[] {
    const links: CrossHostLink[] = [];

    // Build host -> IP mapping
    const hostIPs = new Map<string, Set<string>>();
    for (const alert of alerts) {
      const hostIps = get('host.ip', alert._source) as string[] | string | undefined;
      if (hostIps) {
        const ips = Array.isArray(hostIps) ? hostIps : [hostIps];
        const existing = hostIPs.get(alert.hostName) ?? new Set();
        for (const ip of ips) {
          existing.add(ip);
        }
        hostIPs.set(alert.hostName, existing);
      }
    }

    // Build reverse lookup: IP -> host
    const ipToHost = new Map<string, string>();
    for (const [host, ips] of hostIPs) {
      for (const ip of ips) {
        ipToHost.set(ip, host);
      }
    }

    // Find alerts with destination IPs that belong to other hosts
    for (const alert of alerts) {
      const destIp = get('destination.ip', alert._source) as string | undefined;
      if (!destIp) continue;

      const targetHost = ipToHost.get(destIp);
      if (targetHost && targetHost !== alert.hostName) {
        // This alert shows a connection from one host to another
        const existingLink = links.find(
          (l) =>
            l.sourceHost === alert.hostName &&
            l.targetHost === targetHost &&
            l.linkType === 'network_connection'
        );

        if (existingLink) {
          existingLink.alertIds.push(alert._id);
          existingLink.confidence = Math.min(0.95, existingLink.confidence + 0.1);
        } else {
          links.push({
            sourceHost: alert.hostName,
            targetHost,
            linkType: 'network_connection',
            confidence: 0.8,
            alertIds: [alert._id],
            description: `Network connection from ${alert.hostName} to ${targetHost} (${destIp})`,
          });
        }
      }
    }

    return links;
  }

  // ============================================================
  // Utility methods
  // ============================================================

  /**
   * Create an AlertCluster from a set of enriched alerts.
   */
  private createCluster(
    id: number,
    hostName: string,
    alerts: AlertWithMetadata[]
  ): AlertCluster {
    const sortedByTime = [...alerts].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const allTactics = new Set<string>();
    const allTechniques = new Set<string>();
    const allEntities: ExtractedEntity[] = [];
    const entityKeys = new Set<string>();
    const alertIndices = new Map<string, string>();

    for (const alert of alerts) {
      alertIndices.set(alert._id, alert._index);
      for (const tactic of alert.tactics) allTactics.add(tactic);
      for (const technique of alert.techniques) allTechniques.add(technique);
      for (const entity of alert.entities) {
        const key = `${entity.type}:${entity.normalizedValue}`;
        if (!entityKeys.has(key)) {
          entityKeys.add(key);
          allEntities.push(entity);
        }
      }
    }

    return {
      id: `cluster-${id}`,
      hostName,
      alertIds: alerts.map((a) => a._id),
      alertIndices,
      earliestTimestamp: sortedByTime[0]?.timestamp ?? new Date().toISOString(),
      latestTimestamp: sortedByTime[sortedByTime.length - 1]?.timestamp ?? new Date().toISOString(),
      tactics: [...allTactics],
      techniques: [...allTechniques],
      processTrees: [],
      entities: allEntities,
      crossHostLinks: [],
      confidence: 1.0,
      description: `${hostName}: ${alerts.length} alerts`,
      alerts: alerts.map((a) => ({ _id: a._id, _index: a._index, _source: a._source })),
    };
  }
}
