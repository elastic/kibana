/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type {
  AlertGroupingWorkflowConfig,
  WorkflowExecutionMetrics,
  DryRunResult,
  ObservableTypeKey,
  ExtractedEntity,
  AlertCluster,
  ClusteringResult,
} from '../../types';
import {
  EntityExtractionService,
  CaseMatchingService,
  AlertClusteringService,
  StaticAnalysisService,
  type CaseData,
} from '../../services';
import {
  type AlertGroupingWorkflowState,
  type AlertDocument,
  type GroupingDecision,
  createInitialState,
} from './state';
import {
  LLM_TRIAGED_TAG,
  DEFAULT_ALERTS_INDEX_PATTERN,
  DEFAULT_TIME_RANGE,
  DEFAULT_EXCLUDE_TAGS,
  DEFAULT_INCLUDE_STATUSES,
  MAX_ALERTS_PER_RUN,
} from '../../persistence/constants';

/** MITRE ATT&CK tactic ordering for kill chain display */
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
 * Dependencies for the workflow executor
 */
export interface WorkflowExecutorDependencies {
  logger: Logger;
  esClient: ElasticsearchClient;
  /** Function to get cases by observable values */
  getCasesByObservables: (
    observables: Array<{ type: string; value: string }>
  ) => Promise<CaseData[]>;
  /** Function to create a new case */
  createCase: (params: {
    title: string;
    description?: string;
    severity?: string;
    tags?: string[];
    observables?: Array<{ typeKey: string; value: string; description?: string }>;
  }) => Promise<{ id: string; title: string }>;
  /** Function to attach alerts to a case */
  attachAlertsToCase: (
    caseId: string,
    alerts: Array<{ id: string; index: string }>
  ) => Promise<void>;
  /** Function to generate Attack Discovery for a case */
  generateAttackDiscoveryForCase?: (
    caseId: string,
    alertIds: string[]
  ) => Promise<{
    attackDiscoveryId: string | null;
    /** Alert IDs that were part of the discovered attack */
    relevantAlertIds: string[];
  }>;
  /** Function to detach alerts from a case */
  detachAlertsFromCase?: (caseId: string, alertIds: string[]) => Promise<void>;
  /**
   * Function to analyze if two Attack Discoveries describe the same attack.
   * Returns a similarity score (0-1) and a reason if they should be merged.
   */
  analyzeAttackDiscoverySimilarity?: (
    attackDiscoveryId1: string,
    attackDiscoveryId2: string
  ) => Promise<{
    similarity: number;
    shouldMerge: boolean;
    reason: string;
  }>;
  /**
   * Function to merge two cases.
   * Moves all alerts, observables, and comments from source case to target case.
   */
  mergeCases?: (sourceCaseId: string, targetCaseId: string, mergeReason: string) => Promise<void>;
  /**
   * Function to add a comment to a case.
   */
  addCommentToCase?: (caseId: string, comment: string) => Promise<void>;
  /**
   * Tier 4: LLM-based classification of alert clusters.
   * Takes a cluster description with alert summaries and returns a classification label
   * and refined grouping suggestions.
   */
  classifyAlertCluster?: (
    clusterDescription: string,
    alertSummaries: string[]
  ) => Promise<{
    classification: string;
    description: string;
    suggestedSplits?: Array<{ alertIds: string[]; label: string }>;
  }>;
}

/**
 * Executor for the alert grouping workflow.
 *
 * Pipeline:
 *   1. Fetch alerts
 *   2. Extract entities (with exclusion filtering)
 *   3. Run clustering pipeline (host grouping → temporal → tactic → process → cross-host)
 *   4. Classify clusters (static rule-based by default; LLM-enhanced when available)
 *   5. Match clusters to existing cases
 *   6. Create/update cases from clusters
 *   7. Attach alerts to cases
 *   8. Generate Attack Discovery (LLM, optional)
 *   9. Validate alert relevance
 *  10. Merge related cases (deterministic similarity; or LLM-based AD analysis)
 *  11. Tag processed alerts
 *
 * Static (non-LLM) mode: Steps 4, 10 use rule-based classification and
 * weighted Jaccard similarity respectively. Steps 8-9 are skipped.
 */
export class AlertGroupingWorkflowExecutor {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;
  private readonly deps: WorkflowExecutorDependencies;
  private readonly staticAnalysis: StaticAnalysisService;
  private state: AlertGroupingWorkflowState;
  private startTime: number;
  /** Clustering result from the multi-stage pipeline */
  private clusteringResult?: ClusteringResult;

  constructor(
    config: AlertGroupingWorkflowConfig,
    deps: WorkflowExecutorDependencies,
    isDryRun = false
  ) {
    this.logger = deps.logger;
    this.esClient = deps.esClient;
    this.deps = deps;
    this.staticAnalysis = new StaticAnalysisService({ logger: deps.logger });
    this.state = createInitialState(config, isDryRun);
    this.startTime = Date.now();
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<{
    metrics: WorkflowExecutionMetrics;
    dryRunResult?: DryRunResult;
    groupingDecisions: GroupingDecision[];
    clusteringResult?: ClusteringResult;
    removedAlerts: Array<{
      alertId: string;
      alertIndex: string;
      caseId: string;
      reason: string;
    }>;
    mergedCases: Array<{
      sourceCaseId: string;
      sourceCaseTitle: string;
      targetCaseId: string;
      targetCaseTitle: string;
      reason: string;
    }>;
    errors: string[];
  }> {
    this.logger.info(
      `Starting alert grouping workflow: ${this.state.config.name} (dry run: ${this.state.isDryRun})`
    );

    try {
      // Step 1: Fetch alerts
      await this.fetchAlerts();

      if (this.state.alerts.length === 0) {
        this.logger.info('No alerts to process');
        return this.finalize();
      }

      // Step 2: Extract entities (enhanced with exclusion filtering)
      await this.extractEntities();

      // Step 3: Run multi-stage clustering pipeline (Tier 1-3)
      await this.runClusteringPipeline();

      // Step 4: Classify clusters (static rule-based; LLM-enhanced when available)
      await this.classifyClusters();

      // Step 5: Match clusters to existing cases
      await this.matchCases();

      // Step 6: Make grouping decisions (cluster-based)
      await this.makeGroupingDecisions();

      if (this.state.isDryRun) {
        return this.finalize();
      }

      // Step 7: Create new cases
      await this.createCases();

      // Step 8: Attach alerts to cases
      await this.attachAlerts();

      // Step 9: Generate Attack Discovery (if enabled)
      await this.generateAttackDiscoveries();

      // Step 10: Validate alert relevance based on Attack Discovery
      await this.validateAlertRelevance();

      // Step 11: Merge related cases (deterministic or LLM-based AD analysis)
      await this.mergeRelatedCases();

      // Step 12: Tag processed alerts (excluding removed alerts)
      await this.tagAlerts();

      return this.finalize();
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error}`);
      this.state.errors.push(String(error));
      return this.finalize();
    }
  }

  /**
   * Fetch alerts from Elasticsearch
   */
  private async fetchAlerts(): Promise<void> {
    this.state.currentStep = 'fetch_alerts';
    this.logger.debug('Fetching alerts');

    const config = this.state.config;
    const alertFilter = config.alertFilter ?? {};

    const indexPattern = alertFilter.alertsIndexPattern ?? DEFAULT_ALERTS_INDEX_PATTERN;
    const excludeTags = alertFilter.excludeTags ?? DEFAULT_EXCLUDE_TAGS;
    const includeStatuses = alertFilter.includeStatuses ?? DEFAULT_INCLUDE_STATUSES;
    const timeRange = alertFilter.timeRange ?? DEFAULT_TIME_RANGE;
    const maxAlerts = alertFilter.maxAlertsPerRun ?? MAX_ALERTS_PER_RUN;

    // Build query
    const mustClauses: object[] = [
      {
        range: {
          '@timestamp': {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
      },
      {
        terms: {
          'kibana.alert.workflow_status': includeStatuses,
        },
      },
    ];

    const mustNotClauses: object[] = [];

    // Exclude tagged alerts
    if (excludeTags.length > 0) {
      mustNotClauses.push({
        terms: {
          'kibana.alert.workflow_tags': excludeTags,
        },
      });
    }

    // Severity threshold
    if (alertFilter.severityThreshold) {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(alertFilter.severityThreshold);
      const allowedSeverities = severityOrder.slice(minIndex);
      mustClauses.push({
        terms: {
          'kibana.alert.severity': allowedSeverities,
        },
      });
    }

    // Custom filter
    if (alertFilter.customFilter) {
      mustClauses.push(alertFilter.customFilter);
    }

    const query = {
      bool: {
        must: mustClauses,
        must_not: mustNotClauses,
      },
    };

    try {
      const response = await this.esClient.search<Record<string, unknown>>({
        index: indexPattern,
        size: maxAlerts,
        query,
        sort: [{ '@timestamp': 'desc' }],
        _source: true,
      });

      this.state.alerts = (response.hits.hits as AlertDocument[]).map((hit) => ({
        _id: hit._id,
        _index: hit._index,
        _source: hit._source ?? {},
      }));

      this.state.metrics.alertsScanned = this.state.alerts.length;
      this.logger.debug(`Fetched ${this.state.alerts.length} alerts`);
    } catch (error) {
      this.logger.error(`Failed to fetch alerts: ${error}`);
      this.state.errors.push(`Failed to fetch alerts: ${error}`);
    }
  }

  /**
   * Extract entities from alerts (enhanced with entity exclusion filtering - Tier 1)
   */
  private async extractEntities(): Promise<void> {
    this.state.currentStep = 'extract_entities';
    this.logger.debug('Extracting entities from alerts (with exclusion filtering)');

    const entityService = EntityExtractionService.withConfig(
      this.logger,
      this.state.config.groupingConfig.entityTypes,
      this.state.config.groupingConfig.entityExclusions
    );

    // Extract entities for all alerts
    const result = entityService.extractEntities(this.state.alerts);

    // Group entities by alert
    for (const entity of result.entities) {
      for (const alertId of entity.alertIds) {
        const existing = this.state.alertEntities.get(alertId) ?? [];
        // Check if entity already exists for this alert
        if (
          !existing.some(
            (e) => e.type === entity.type && e.normalizedValue === entity.normalizedValue
          )
        ) {
          existing.push(entity);
          this.state.alertEntities.set(alertId, existing);
        }
      }
    }

    this.state.allEntities = result.entities;
    this.state.metrics.entitiesExtracted = result.entities.length;
    this.state.metrics.alertsProcessed = this.state.alerts.length;

    this.logger.debug(
      `Extracted ${result.entities.length} unique entities from ${this.state.alerts.length} alerts ` +
        `(exclusion filtering active)`
    );
  }

  // ============================================================
  // Tier 1-3: Multi-stage clustering pipeline
  // ============================================================

  /**
   * Run the multi-stage alert clustering pipeline.
   * This replaces simple entity-to-case matching with a sophisticated pipeline:
   *   Stage 1: Host-primary grouping
   *   Stage 2: Temporal clustering
   *   Stage 3: Tactic chain sub-grouping
   *   Stage 4: Process tree correlation
   *   Stage 5: Cross-host correlation
   */
  private async runClusteringPipeline(): Promise<void> {
    this.state.currentStep = 'clustering_pipeline';
    this.logger.info('Running multi-stage clustering pipeline');

    const entityService = EntityExtractionService.withConfig(
      this.logger,
      this.state.config.groupingConfig.entityTypes,
      this.state.config.groupingConfig.entityExclusions
    );

    const clusteringService = new AlertClusteringService({
      logger: this.logger,
      config: this.state.config.groupingConfig,
      entityService,
    });

    this.clusteringResult = clusteringService.clusterAlerts(
      this.state.alerts,
      this.state.alertEntities
    );

    this.logger.info(
      `Clustering pipeline produced ${this.clusteringResult.clusters.length} clusters ` +
        `across ${this.clusteringResult.metrics.uniqueHosts} hosts, ` +
        `${this.clusteringResult.crossHostLinks.length} cross-host links`
    );
  }

  // ============================================================
  // Tier 4: LLM-based classification
  // ============================================================

  /**
   * Classify alert clusters.
   *
   * When an LLM connector is available and enabled, uses LLM-based classification
   * that can also suggest cluster splits. Otherwise, falls back to rule-based
   * static classification using MITRE tactic/technique distributions.
   */
  private async classifyClusters(): Promise<void> {
    if (!this.clusteringResult || this.clusteringResult.clusters.length === 0) {
      return;
    }

    const llmConfig = this.state.config.groupingConfig.llmClassification;
    const useLlm = llmConfig?.enabled && !!this.deps.classifyAlertCluster;

    this.logger.info(
      `Classifying ${this.clusteringResult.clusters.length} clusters ` +
        `using ${useLlm ? 'LLM' : 'static rule-based'} classification`
    );

    if (useLlm && llmConfig) {
      await this.classifyClustersWithLlm(llmConfig.maxAlertsPerClassification ?? 50);
    } else {
      this.classifyClustersStatically();
    }
  }

  /**
   * LLM-based cluster classification (Tier 4).
   * Sends cluster description + alert summaries to the LLM for richer labels and split suggestions.
   */
  private async classifyClustersWithLlm(maxAlertsPerCall: number): Promise<void> {
    if (!this.clusteringResult) return;

    for (const cluster of this.clusteringResult.clusters) {
      try {
        const clusterDesc = this.buildClusterDescription(cluster);
        const alertSummaries = this.buildAlertSummaries(cluster, maxAlertsPerCall);

        if (!this.deps.classifyAlertCluster) return;

        const result = await this.deps.classifyAlertCluster(clusterDesc, alertSummaries);
        cluster.llmClassification = result.classification;
        cluster.llmDescription = result.description;

        this.logger.debug(`Cluster ${cluster.id} classified (LLM) as: "${result.classification}"`);

        if (result.suggestedSplits && result.suggestedSplits.length > 1) {
          this.logger.info(
            `LLM suggests splitting cluster ${cluster.id} into ${result.suggestedSplits.length} sub-groups`
          );
          this.applySplitSuggestions(cluster, result.suggestedSplits);
        }
      } catch (error) {
        this.logger.error(
          `LLM classification failed for cluster ${cluster.id}, falling back to static: ${error}`
        );
        // Fall back to static for this cluster
        const { classification, description } = this.staticAnalysis.classifyCluster(cluster);
        cluster.llmClassification = classification;
        cluster.llmDescription = description;
      }
    }
  }

  /**
   * Rule-based static cluster classification.
   * Uses MITRE tactic/technique distributions to assign deterministic labels.
   */
  private classifyClustersStatically(): void {
    if (!this.clusteringResult) return;

    for (const cluster of this.clusteringResult.clusters) {
      const { classification, description } = this.staticAnalysis.classifyCluster(cluster);
      cluster.llmClassification = classification;
      cluster.llmDescription = description;

      this.logger.debug(`Cluster ${cluster.id} classified (static) as: "${classification}"`);
    }
  }

  /**
   * Build a human-readable cluster description for the LLM.
   */
  private buildClusterDescription(cluster: AlertCluster): string {
    const orderedTactics = cluster.tactics.sort((a, b) => {
      const orderA = TACTIC_ORDER[a] ?? 99;
      const orderB = TACTIC_ORDER[b] ?? 99;
      return orderA - orderB;
    });

    return [
      `Host: ${cluster.hostName}`,
      `Alert count: ${cluster.alertIds.length}`,
      `Time range: ${cluster.earliestTimestamp} to ${cluster.latestTimestamp}`,
      `MITRE tactics: ${orderedTactics.join(', ')}`,
      `MITRE techniques: ${cluster.techniques.join(', ')}`,
      cluster.processTrees.length > 0
        ? `Key processes: ${cluster.processTrees.map((p) => p.executable).join(', ')}`
        : '',
      cluster.crossHostLinks.length > 0
        ? `Cross-host links: ${cluster.crossHostLinks
            .map((l) => `${l.sourceHost} → ${l.targetHost} (${l.linkType})`)
            .join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Build alert summaries for LLM classification (limited to maxAlerts).
   */
  private buildAlertSummaries(cluster: AlertCluster, maxAlerts: number): string[] {
    const alerts = cluster.alerts ?? [];
    const subset = alerts.slice(0, maxAlerts);

    return subset.map((alert) => {
      const source = alert._source;
      const ruleName = (source['kibana.alert.rule.name'] as string) ?? 'Unknown rule';
      const timestamp = (source['@timestamp'] as string) ?? '';
      const processName = (source as Record<string, unknown>)?.process
        ? ((source as Record<string, Record<string, unknown>>)?.process?.name as string) ?? ''
        : '';
      const userName = (source as Record<string, unknown>)?.user
        ? ((source as Record<string, Record<string, unknown>>)?.user?.name as string) ?? ''
        : '';

      return `[${timestamp}] ${ruleName} | process: ${processName} | user: ${userName}`;
    });
  }

  /**
   * Apply LLM-suggested splits to a cluster.
   */
  private applySplitSuggestions(
    cluster: AlertCluster,
    suggestions: Array<{ alertIds: string[]; label: string }>
  ): void {
    if (!this.clusteringResult) return;

    // Remove the original cluster
    const idx = this.clusteringResult.clusters.indexOf(cluster);
    if (idx === -1) return;

    this.clusteringResult.clusters.splice(idx, 1);

    // Create new sub-clusters from suggestions
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const subAlerts = (cluster.alerts ?? []).filter((a) => suggestion.alertIds.includes(a._id));

      if (subAlerts.length > 0) {
        const timestamps = subAlerts
          .map((a) => (a._source['@timestamp'] as string) ?? '')
          .filter(Boolean)
          .sort();

        const subCluster: AlertCluster = {
          id: `${cluster.id}-llm-${i}`,
          hostName: cluster.hostName,
          alertIds: suggestion.alertIds,
          alertIndices: new Map(
            suggestion.alertIds.map((id) => [id, cluster.alertIndices.get(id) ?? ''])
          ),
          earliestTimestamp: timestamps[0] ?? cluster.earliestTimestamp,
          latestTimestamp: timestamps[timestamps.length - 1] ?? cluster.latestTimestamp,
          tactics: cluster.tactics, // Will be refined
          techniques: cluster.techniques,
          processTrees: [],
          entities: cluster.entities.filter((e) =>
            e.alertIds.some((id) => suggestion.alertIds.includes(id))
          ),
          crossHostLinks: cluster.crossHostLinks,
          confidence: 0.8, // LLM-derived clusters have slightly lower confidence
          llmClassification: suggestion.label,
          llmDescription: suggestion.label,
          description: `${cluster.hostName}: ${suggestion.alertIds.length} alerts - ${suggestion.label}`,
          alerts: subAlerts,
        };

        this.clusteringResult.clusters.push(subCluster);
      }
    }
  }

  /**
   * Match extracted entities to existing cases.
   * When clustering is active, matches at the cluster level rather than per-alert.
   */
  private async matchCases(): Promise<void> {
    this.state.currentStep = 'match_cases';
    this.logger.debug('Matching entities to existing cases');

    if (this.state.allEntities.length === 0) {
      return;
    }

    // Get unique observable queries
    const observableQueries = this.state.allEntities.map((entity) => ({
      type: entity.type,
      value: entity.normalizedValue,
    }));

    try {
      this.state.existingCases = await this.deps.getCasesByObservables(observableQueries);
      this.logger.debug(`Found ${this.state.existingCases.length} potentially matching cases`);
    } catch (error) {
      this.logger.error(`Failed to fetch cases: ${error}`);
      this.state.errors.push(`Failed to fetch cases: ${error}`);
    }
  }

  /**
   * Make grouping decisions for each alert.
   *
   * When clustering is active (Tier 1-3), decisions are made per-cluster:
   * each cluster becomes a case. The matching service is used to check if
   * existing cases already cover a cluster's entities.
   *
   * When clustering is not active, falls back to the original per-alert matching.
   */
  private async makeGroupingDecisions(): Promise<void> {
    this.logger.debug('Making grouping decisions');

    if (this.clusteringResult && this.clusteringResult.clusters.length > 0) {
      // Cluster-based grouping (Tier 1-3)
      await this.makeClusterGroupingDecisions();
    } else {
      // Fallback: original per-alert grouping
      await this.makePerAlertGroupingDecisions();
    }

    // Build dry run result if applicable
    if (this.state.isDryRun) {
      this.buildDryRunResult();
    }
  }

  /**
   * Cluster-based grouping: each cluster becomes one case.
   * Matches clusters against existing cases to avoid duplicates.
   */
  private async makeClusterGroupingDecisions(): Promise<void> {
    const groupingDecisions: GroupingDecision[] = [];
    const matchingService = new CaseMatchingService({
      logger: this.logger,
      groupingConfig: this.state.config.groupingConfig,
    });

    let pendingCaseCounter = 0;
    const clusterToPendingCase = new Map<string, string>();

    if (!this.clusteringResult) return;

    for (const cluster of this.clusteringResult.clusters) {
      // Try to match this cluster's entities to an existing case
      const clusterMatches = matchingService.findMatchingCases(
        cluster.entities,
        this.state.existingCases,
        cluster.earliestTimestamp
      );

      const bestMatch = matchingService.selectBestMatch(clusterMatches);
      const pendingCaseId = bestMatch?.caseId ?? `pending-${++pendingCaseCounter}`;
      const isNewCase = !bestMatch;

      if (isNewCase) {
        clusterToPendingCase.set(cluster.id, pendingCaseId);
      } else {
        this.state.metrics.casesMatched++;
      }

      // Build explanation based on cluster metadata
      const tacticChain = cluster.tactics
        .sort((a, b) => (TACTIC_ORDER[a] ?? 99) - (TACTIC_ORDER[b] ?? 99))
        .join(' → ');

      const clusterExplanation = isNewCase
        ? `New cluster: ${cluster.description}. Kill chain: ${tacticChain}${
            cluster.llmClassification ? `. LLM classification: ${cluster.llmClassification}` : ''
          }${
            cluster.crossHostLinks.length > 0
              ? `. Cross-host links: ${cluster.crossHostLinks
                  .map((l) => `${l.sourceHost}↔${l.targetHost}`)
                  .join(', ')}`
              : ''
          }`
        : `Matched to existing case "${bestMatch?.caseTitle}" (score: ${(
            (bestMatch?.matchScore ?? 0) * 100
          ).toFixed(1)}%). Cluster: ${cluster.description}`;

      // Create a grouping decision for every alert in the cluster
      for (const alertId of cluster.alertIds) {
        const alertIndex = cluster.alertIndices.get(alertId) ?? '';
        const entities = this.state.alertEntities.get(alertId) ?? [];

        groupingDecisions.push({
          alertId,
          alertIndex,
          caseId: pendingCaseId,
          createNewCase: isNewCase,
          matchScore: bestMatch?.matchScore,
          entities,
          explanation: clusterExplanation,
          matchedObservables: bestMatch?.matchedObservables.map((mo) => ({
            type: mo.type,
            value: mo.value,
            matchedEntityValue: mo.matchedEntity.normalizedValue,
            observableId: mo.observableId,
          })),
        });
      }
    }

    this.state.groupingDecisions = groupingDecisions;
    this.state.metrics.alertsGrouped = groupingDecisions.filter(
      (d) => d.caseId || d.createNewCase
    ).length;

    const uniquePendingCaseIds = new Set(
      groupingDecisions.filter((d) => d.createNewCase).map((d) => d.caseId)
    );

    this.logger.info(
      `Cluster-based decisions: ${groupingDecisions.length} alerts, ` +
        `${this.state.metrics.casesMatched} matched to existing cases, ` +
        `${uniquePendingCaseIds.size} new cases to create`
    );
  }

  /**
   * Original per-alert grouping (fallback when clustering is disabled).
   */
  private async makePerAlertGroupingDecisions(): Promise<void> {
    const matchingService = CaseMatchingService.withConfig(this.state.config.groupingConfig);

    const groupingDecisions: GroupingDecision[] = [];
    const alertsPerCase = new Map<string, number>();

    interface PendingCase {
      pendingCaseId: string;
      entities: ExtractedEntity[];
      alertIds: string[];
      observables: Set<string>;
      earliestTimestamp: string;
      latestTimestamp: string;
    }
    const pendingNewCases: PendingCase[] = [];
    let pendingCaseCounter = 0;

    const getAlertTimestamp = (alert: AlertDocument): string => {
      const source = alert._source as Record<string, unknown>;
      const timestamp = source['@timestamp'] as string | undefined;
      return timestamp ?? new Date().toISOString();
    };

    for (const caseData of this.state.existingCases) {
      alertsPerCase.set(caseData.id, caseData.alertCount ?? 0);
    }

    const searchableCases: CaseData[] = [...this.state.existingCases];

    for (const alert of this.state.alerts) {
      const entities = this.state.alertEntities.get(alert._id) ?? [];
      const alertTimestamp = getAlertTimestamp(alert);
      const matches = matchingService.findMatchingCases(entities, searchableCases, alertTimestamp);

      const maxPerCase = this.state.config.groupingConfig.maxAlertsPerCase ?? 1000;
      const availableMatches = matches.filter((match) => {
        const currentCount = alertsPerCase.get(match.caseId) ?? 0;
        return currentCount < maxPerCase;
      });

      const bestMatch = matchingService.selectBestMatch(availableMatches);

      if (bestMatch) {
        const isPendingCase = bestMatch.caseId.startsWith('pending-');
        const matchedObservablesDetail = bestMatch.matchedObservables.map((mo) => ({
          type: mo.type,
          value: mo.value,
          matchedEntityValue: mo.matchedEntity.normalizedValue,
          observableId: mo.observableId,
        }));
        const matchedTypes = [...new Set(matchedObservablesDetail.map((mo) => mo.type))];
        const explanation = isPendingCase
          ? `Matched to pending case "${bestMatch.caseTitle}" (score: ${(
              bestMatch.matchScore * 100
            ).toFixed(1)}%) via ${
              matchedObservablesDetail.length
            } shared entities: ${matchedTypes.join(', ')}`
          : `Matched to existing case "${bestMatch.caseTitle}" (score: ${(
              bestMatch.matchScore * 100
            ).toFixed(1)}%) via ${
              matchedObservablesDetail.length
            } shared entities: ${matchedTypes.join(', ')}`;

        groupingDecisions.push({
          alertId: alert._id,
          alertIndex: alert._index,
          caseId: bestMatch.caseId,
          createNewCase: isPendingCase,
          matchScore: bestMatch.matchScore,
          entities,
          explanation,
          matchedObservables: matchedObservablesDetail,
        });

        alertsPerCase.set(bestMatch.caseId, (alertsPerCase.get(bestMatch.caseId) ?? 0) + 1);

        if (!isPendingCase) {
          this.state.metrics.casesMatched++;
        } else {
          const pendingCase = pendingNewCases.find((pc) => pc.pendingCaseId === bestMatch.caseId);
          if (pendingCase) {
            pendingCase.alertIds.push(alert._id);
            for (const entity of entities) {
              const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;
              if (!pendingCase.observables.has(key)) {
                pendingCase.observables.add(key);
                pendingCase.entities.push(entity);
              }
            }
            if (alertTimestamp < pendingCase.earliestTimestamp) {
              pendingCase.earliestTimestamp = alertTimestamp;
            }
            if (alertTimestamp > pendingCase.latestTimestamp) {
              pendingCase.latestTimestamp = alertTimestamp;
            }
            const searchableCase = searchableCases.find((sc) => sc.id === bestMatch.caseId);
            if (searchableCase) {
              searchableCase.observables = pendingCase.entities.map((e) => ({
                typeKey: e.type,
                value: e.normalizedValue.toLowerCase(),
              }));
              searchableCase.earliestAlertTimestamp = pendingCase.earliestTimestamp;
              searchableCase.latestAlertTimestamp = pendingCase.latestTimestamp;
            }
          }
        }
      } else if (this.state.config.groupingConfig.createNewCaseIfNoMatch !== false) {
        const pendingCaseId = `pending-${++pendingCaseCounter}`;
        const observablesSet = new Set<string>();
        for (const entity of entities) {
          observablesSet.add(`${entity.type}:${entity.normalizedValue.toLowerCase()}`);
        }

        pendingNewCases.push({
          pendingCaseId,
          entities: [...entities],
          alertIds: [alert._id],
          observables: observablesSet,
          earliestTimestamp: alertTimestamp,
          latestTimestamp: alertTimestamp,
        });

        searchableCases.push({
          id: pendingCaseId,
          title: `Pending Case ${pendingCaseCounter}`,
          status: 'open',
          observables: entities.map((e) => ({
            typeKey: e.type,
            value: e.normalizedValue.toLowerCase(),
          })),
          alertIds: [alert._id],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          earliestAlertTimestamp: alertTimestamp,
          latestAlertTimestamp: alertTimestamp,
        });

        alertsPerCase.set(pendingCaseId, 1);
        const entityTypes = [...new Set(entities.map((e) => e.type))];
        const explanation = `No matching case found. Creating new case with ${
          entities.length
        } entities: ${entityTypes.join(', ')}`;

        groupingDecisions.push({
          alertId: alert._id,
          alertIndex: alert._index,
          caseId: pendingCaseId,
          createNewCase: true,
          entities,
          explanation,
        });
      }
    }

    this.state.groupingDecisions = groupingDecisions;
    this.state.metrics.alertsGrouped = groupingDecisions.filter(
      (d) => d.caseId || d.createNewCase
    ).length;

    const uniquePendingCaseIds = new Set(
      groupingDecisions.filter((d) => d.createNewCase).map((d) => d.caseId)
    );

    this.logger.debug(
      `Per-alert decisions: ${groupingDecisions.length} alerts, ` +
        `${this.state.metrics.casesMatched} to existing, ${uniquePendingCaseIds.size} new cases`
    );
  }

  /**
   * Build dry run result
   */
  private buildDryRunResult(): void {
    const groupings: DryRunResult['groupings'] = [];

    // Group decisions by case (including pending cases)
    const decisionsByCase = new Map<string, GroupingDecision[]>();
    const existingCaseDecisions = new Map<string, GroupingDecision[]>();
    const pendingCaseDecisions = new Map<string, GroupingDecision[]>();

    for (const decision of this.state.groupingDecisions) {
      if (decision.caseId) {
        const existing = decisionsByCase.get(decision.caseId) ?? [];
        existing.push(decision);
        decisionsByCase.set(decision.caseId, existing);

        // Separate existing vs pending cases
        if (decision.createNewCase || decision.caseId.startsWith('pending-')) {
          const pending = pendingCaseDecisions.get(decision.caseId) ?? [];
          pending.push(decision);
          pendingCaseDecisions.set(decision.caseId, pending);
        } else {
          const existingDecisions = existingCaseDecisions.get(decision.caseId) ?? [];
          existingDecisions.push(decision);
          existingCaseDecisions.set(decision.caseId, existingDecisions);
        }
      }
    }

    // Add existing case groupings
    for (const [caseId, decisions] of existingCaseDecisions) {
      const caseData = this.state.existingCases.find((c) => c.id === caseId);
      const observablesToAdd = this.getNewObservables(decisions, caseData);

      groupings.push({
        caseId,
        caseTitle: caseData?.title,
        isNewCase: false,
        alertIds: decisions.map((d) => d.alertId),
        matchScore: Math.max(...decisions.map((d) => d.matchScore ?? 0)),
        observablesToAdd,
      });
    }

    // Add pending (new) case groupings - now properly grouped by pending case ID
    for (const [pendingCaseId, decisions] of pendingCaseDecisions) {
      // Collect all unique entities from all alerts in this pending case group
      const entitySet = new Set<string>();
      const observablesToAdd: Array<{ type: ObservableTypeKey; value: string }> = [];

      for (const decision of decisions) {
        for (const entity of decision.entities) {
          const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;
          if (!entitySet.has(key)) {
            entitySet.add(key);
            observablesToAdd.push({ type: entity.type, value: entity.normalizedValue });
          }
        }
      }

      groupings.push({
        isNewCase: true,
        alertIds: decisions.map((d) => d.alertId),
        matchScore: 0,
        observablesToAdd,
      });
    }

    this.state.dryRunResult = {
      alertsToProcess: this.state.alerts.length,
      groupings,
      casesToCreate: pendingCaseDecisions.size,
      casesToUpdate: existingCaseDecisions.size,
      observablesToAdd: groupings.reduce((sum, g) => sum + g.observablesToAdd.length, 0),
    };
  }

  /**
   * Get new observables that would be added to a case
   */
  private getNewObservables(
    decisions: GroupingDecision[],
    caseData?: CaseData
  ): Array<{ type: ObservableTypeKey; value: string }> {
    const existingObservables = new Set(
      (caseData?.observables ?? []).map((o) => `${o.typeKey}:${o.value.toLowerCase()}`)
    );

    const newObservables: Array<{ type: ObservableTypeKey; value: string }> = [];

    for (const decision of decisions) {
      for (const entity of decision.entities) {
        const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;
        if (!existingObservables.has(key)) {
          existingObservables.add(key);
          newObservables.push({ type: entity.type, value: entity.normalizedValue });
        }
      }
    }

    return newObservables;
  }

  /**
   * Create new cases for alerts that don't match existing cases
   */
  private async createCases(): Promise<void> {
    this.state.currentStep = 'create_cases';

    const newCaseDecisions = this.state.groupingDecisions.filter((d) => d.createNewCase);
    if (newCaseDecisions.length === 0) {
      return;
    }

    // Group decisions by their pending case ID
    // Multiple alerts with shared entities will have the same pending case ID
    const decisionsByPendingCase = new Map<string, GroupingDecision[]>();
    for (const decision of newCaseDecisions) {
      const pendingCaseId = decision.caseId ?? `single-${decision.alertId}`;
      const existing = decisionsByPendingCase.get(pendingCaseId) ?? [];
      existing.push(decision);
      decisionsByPendingCase.set(pendingCaseId, existing);
    }

    this.logger.debug(
      `Creating ${decisionsByPendingCase.size} new cases for ${newCaseDecisions.length} alerts`
    );

    // Create one case per unique pending case group
    for (const [pendingCaseId, decisions] of decisionsByPendingCase) {
      try {
        const template = this.state.config.caseTemplate ?? {};

        // Collect all unique entities from all alerts in this group
        const entitySet = new Set<string>();
        const allEntities: ExtractedEntity[] = [];
        const allAlertIds: string[] = [];

        for (const decision of decisions) {
          allAlertIds.push(decision.alertId);
          for (const entity of decision.entities) {
            const key = `${entity.type}:${entity.normalizedValue.toLowerCase()}`;
            if (!entitySet.has(key)) {
              entitySet.add(key);
              allEntities.push(entity);
            }
          }
        }

        const primaryEntity = allEntities[0];
        // Use cluster metadata for richer case titles when available
        const matchingCluster = this.clusteringResult?.clusters.find((c) =>
          c.alertIds.some((id) => allAlertIds.includes(id))
        );
        const title = matchingCluster
          ? this.formatClusterCaseTitle(template.titleTemplate, matchingCluster)
          : this.formatCaseTitle(template.titleTemplate, primaryEntity);
        const description = matchingCluster
          ? this.formatClusterDescription(matchingCluster)
          : template.descriptionTemplate ??
            'Automatically grouped alerts based on shared entities.';

        const observables = allEntities.map((e) => ({
          typeKey: e.type,
          value: e.normalizedValue,
          description: `Extracted from ${allAlertIds.length} alert(s)`,
        }));

        const newCase = await this.deps.createCase({
          title,
          description,
          severity: template.severity ?? 'medium',
          tags: [...(template.tags ?? []), ...(this.state.config.tags ?? [])],
          observables,
        });

        // Update all decisions in this group with the real case ID
        for (const decision of decisions) {
          this.state.createdCases.set(decision.alertId, newCase);
          decision.caseId = newCase.id;
          decision.createNewCase = false;
        }

        this.state.metrics.casesCreated++;

        this.logger.debug(
          `Created case ${newCase.id} for ${allAlertIds.length} alerts with ${allEntities.length} unique entities`
        );
      } catch (error) {
        this.logger.error(`Failed to create case for pending group ${pendingCaseId}: ${error}`);
        this.state.errors.push(`Failed to create case: ${error}`);
      }
    }
  }

  /**
   * Format case title from template
   */
  private formatCaseTitle(
    template: string | undefined,
    primaryEntity: ExtractedEntity | undefined
  ): string {
    const defaultTemplate = 'Alert Group: {{primary_entity}} - {{timestamp}}';
    const titleTemplate = template ?? defaultTemplate;

    const entityDisplay = primaryEntity
      ? `${primaryEntity.type.replace('observable-type-', '')}: ${primaryEntity.normalizedValue}`
      : 'Unknown';

    return titleTemplate
      .replace('{{primary_entity}}', entityDisplay)
      .replace('{{timestamp}}', new Date().toISOString());
  }

  /**
   * Format a case title based on cluster metadata.
   * Uses the classification label (from LLM or static analysis) when available.
   */
  private formatClusterCaseTitle(_template: string | undefined, cluster: AlertCluster): string {
    if (cluster.llmClassification) {
      return `${cluster.llmClassification} on ${cluster.hostName} (${cluster.alertIds.length} alerts)`;
    }

    // Fallback: use static classification
    const { classification } = this.staticAnalysis.classifyCluster(cluster);
    return `${classification} on ${cluster.hostName} (${cluster.alertIds.length} alerts)`;
  }

  /**
   * Format a case description based on cluster metadata.
   * Delegates to StaticAnalysisService for rich, structured descriptions.
   */
  private formatClusterDescription(cluster: AlertCluster): string {
    const alerts = cluster.alerts ?? [];
    const summary = this.staticAnalysis.generateAttackSummary(cluster, alerts);
    return summary.description;
  }

  /**
   * Attach alerts to cases
   */
  private async attachAlerts(): Promise<void> {
    this.state.currentStep = 'attach_alerts';

    // Group alerts by case
    const alertsByCase = new Map<string, Array<{ id: string; index: string }>>();

    for (const decision of this.state.groupingDecisions) {
      if (decision.caseId) {
        const alerts = alertsByCase.get(decision.caseId) ?? [];
        alerts.push({ id: decision.alertId, index: decision.alertIndex });
        alertsByCase.set(decision.caseId, alerts);
      }
    }

    this.logger.debug(`Attaching alerts to ${alertsByCase.size} cases`);

    for (const [caseId, alerts] of alertsByCase) {
      try {
        await this.deps.attachAlertsToCase(caseId, alerts);
        this.state.metrics.casesUpdated++;
      } catch (error) {
        this.logger.error(`Failed to attach alerts to case ${caseId}: ${error}`);
        this.state.errors.push(`Failed to attach alerts: ${error}`);
      }
    }
  }

  // Track relevant alerts per case (populated by Attack Discovery)
  private relevantAlertsByCase = new Map<string, Set<string>>();

  /**
   * Generate Attack Discovery for cases (if enabled)
   */
  private async generateAttackDiscoveries(): Promise<void> {
    this.state.currentStep = 'generate_attack_discovery';

    const adConfig = this.state.config.attackDiscoveryConfig;
    if (!adConfig?.enabled || !this.deps.generateAttackDiscoveryForCase) {
      return;
    }

    // Get unique cases that had alerts attached, along with their alert IDs
    const caseAlerts = new Map<string, string[]>();
    for (const decision of this.state.groupingDecisions) {
      if (decision.caseId && !decision.caseId.startsWith('pending-')) {
        // Only for existing cases (pending cases are handled via createdCases)
        const alerts = caseAlerts.get(decision.caseId) ?? [];
        alerts.push(decision.alertId);
        caseAlerts.set(decision.caseId, alerts);
      }
    }

    // Also include alerts from newly created cases
    for (const [pendingId, caseInfo] of this.state.createdCases) {
      const alertsForPending = this.state.groupingDecisions
        .filter((d) => d.caseId === pendingId)
        .map((d) => d.alertId);
      if (alertsForPending.length > 0) {
        caseAlerts.set(caseInfo.id, alertsForPending);
      }
    }

    this.logger.debug(`Generating Attack Discovery for ${caseAlerts.size} cases`);

    for (const [caseId, alertIds] of caseAlerts) {
      try {
        const result = await this.deps.generateAttackDiscoveryForCase(caseId, alertIds);
        if (result.attackDiscoveryId) {
          this.state.attackDiscoveries.set(caseId, result.attackDiscoveryId);
          this.state.metrics.attackDiscoveriesGenerated++;

          // Store the relevant alerts for validation
          this.relevantAlertsByCase.set(caseId, new Set(result.relevantAlertIds));

          this.logger.debug(
            `Attack Discovery for case ${caseId}: ${result.relevantAlertIds.length}/${alertIds.length} alerts were relevant`
          );
        }
      } catch (error) {
        this.logger.error(`Failed to generate Attack Discovery for case ${caseId}: ${error}`);
        this.state.errors.push(`Failed to generate Attack Discovery: ${error}`);
      }
    }
  }

  /**
   * Validate alert relevance based on Attack Discovery results
   * Removes alerts that weren't part of the discovered attack
   */
  private async validateAlertRelevance(): Promise<void> {
    this.state.currentStep = 'validate_alert_relevance';

    const adConfig = this.state.config.attackDiscoveryConfig;
    if (!adConfig?.enabled || !adConfig?.validateAlertRelevance) {
      this.logger.debug('Alert relevance validation is disabled');
      return;
    }

    if (!this.deps.detachAlertsFromCase) {
      this.logger.warn('detachAlertsFromCase not provided, skipping alert validation');
      return;
    }

    const alertsToRemove: Array<{
      caseId: string;
      alertId: string;
      alertIndex: string;
      reason: string;
    }> = [];

    // Check each case that had Attack Discovery generated
    for (const [caseId, relevantAlerts] of this.relevantAlertsByCase) {
      // Get all alerts that were attached to this case
      const attachedAlerts = this.state.groupingDecisions.filter((d) => {
        // Handle both direct case ID and pending case -> real case mapping
        if (d.caseId === caseId) return true;
        const createdCase = this.state.createdCases.get(d.caseId ?? '');
        return createdCase?.id === caseId;
      });

      for (const decision of attachedAlerts) {
        if (!relevantAlerts.has(decision.alertId)) {
          const reason = `Alert was not part of the discovered attack pattern. Entities: ${decision.entities
            .map((e) => `${e.type}:${e.normalizedValue}`)
            .join(', ')}`;

          alertsToRemove.push({
            caseId,
            alertId: decision.alertId,
            alertIndex: decision.alertIndex,
            reason,
          });

          this.logger.info(
            `Alert ${decision.alertId} will be removed from case ${caseId}: ${reason}`
          );
        }
      }
    }

    if (alertsToRemove.length === 0) {
      this.logger.debug('All alerts were relevant to their cases');
      return;
    }

    this.logger.info(
      `Removing ${alertsToRemove.length} alerts that were not part of the discovered attacks`
    );

    // Group alerts by case for batch removal
    const alertsByCaseToRemove = new Map<string, string[]>();
    for (const alert of alertsToRemove) {
      const existing = alertsByCaseToRemove.get(alert.caseId) ?? [];
      existing.push(alert.alertId);
      alertsByCaseToRemove.set(alert.caseId, existing);
    }

    // Detach alerts from cases
    for (const [caseId, alertIds] of alertsByCaseToRemove) {
      try {
        if (this.deps.detachAlertsFromCase) {
          await this.deps.detachAlertsFromCase(caseId, alertIds);
        }
        this.logger.debug(`Detached ${alertIds.length} alerts from case ${caseId}`);
      } catch (error) {
        this.logger.error(`Failed to detach alerts from case ${caseId}: ${error}`);
        this.state.errors.push(`Failed to detach alerts from case: ${error}`);
      }
    }

    // Remove llm-triaged tag from removed alerts so they can be re-processed
    const alertsForTagRemoval = alertsToRemove.map((a) => ({
      id: a.alertId,
      index: a.alertIndex,
    }));

    if (alertsForTagRemoval.length > 0) {
      try {
        const operations = alertsForTagRemoval.flatMap((alert) => [
          { update: { _index: alert.index, _id: alert.id } },
          {
            script: {
              source: `
                if (ctx._source['kibana.alert.workflow_tags'] != null) {
                  ctx._source['kibana.alert.workflow_tags'].removeIf(tag -> tag == params.tag);
                }
              `,
              params: { tag: LLM_TRIAGED_TAG },
            },
          },
        ]);

        await this.esClient.bulk({
          operations,
          refresh: 'wait_for',
        });

        this.logger.debug(
          `Removed ${LLM_TRIAGED_TAG} tag from ${alertsForTagRemoval.length} alerts`
        );
      } catch (error) {
        this.logger.error(`Failed to remove tags from alerts: ${error}`);
        this.state.errors.push(`Failed to remove tags from alerts: ${error}`);
      }
    }

    // Store removed alerts for reporting
    this.state.removedAlerts = alertsToRemove;
    this.state.metrics.alertsRemovedFromCases = alertsToRemove.length;

    // Update grouping decisions to mark removed alerts
    for (const removed of alertsToRemove) {
      const decision = this.state.groupingDecisions.find((d) => d.alertId === removed.alertId);
      if (decision) {
        decision.explanation = `REMOVED: ${removed.reason}. Original: ${decision.explanation}`;
      }
    }
  }

  /**
   * Merge related cases based on similarity analysis.
   *
   * Supports two modes:
   * 1. **LLM-based** (when AD is enabled + `analyzeAttackDiscoverySimilarity` is provided):
   *    Compares Attack Discovery narratives via LLM.
   * 2. **Deterministic** (when `enableCaseMerging` is set but no AD/LLM):
   *    Uses entity overlap, technique overlap, rule overlap, and temporal proximity.
   */
  private async mergeRelatedCases(): Promise<void> {
    this.state.currentStep = 'merge_related_cases';

    const adConfig = this.state.config.attackDiscoveryConfig;
    const groupingConfig = this.state.config.groupingConfig;
    const mergingEnabled = adConfig?.enableCaseMerging || groupingConfig.mergeSimilarCases;

    if (!mergingEnabled) {
      this.logger.debug('Case merging is disabled');
      return;
    }

    if (!this.deps.mergeCases) {
      this.logger.warn('mergeCases dependency not provided, skipping case merging');
      return;
    }

    // Choose strategy: LLM-based AD similarity or deterministic
    const useLlmSimilarity =
      adConfig?.enabled &&
      this.deps.analyzeAttackDiscoverySimilarity &&
      this.state.attackDiscoveries.size >= 2;

    if (useLlmSimilarity) {
      await this.mergeRelatedCasesWithLlm();
    } else {
      await this.mergeRelatedCasesDeterministically();
    }
  }

  /**
   * LLM-based case merging: compare Attack Discovery narratives via LLM.
   */
  private async mergeRelatedCasesWithLlm(): Promise<void> {
    const casesWithAD = Array.from(this.state.attackDiscoveries.entries());
    const similarityThreshold =
      this.state.config.attackDiscoveryConfig?.caseMergeSimilarityThreshold ?? 0.7;

    await this.findAndMergeCasePairs(
      casesWithAD.map(([caseId]) => caseId),
      similarityThreshold,
      async (caseId1, caseId2) => {
        const adId1 = this.state.attackDiscoveries.get(caseId1);
        const adId2 = this.state.attackDiscoveries.get(caseId2);
        if (!adId1 || !adId2 || !this.deps.analyzeAttackDiscoverySimilarity) {
          return { similarity: 0, shouldMerge: false, reason: 'Missing attack discovery data' };
        }
        return this.deps.analyzeAttackDiscoverySimilarity(adId1, adId2);
      },
      'Attack Discovery analysis'
    );
  }

  /**
   * Deterministic case merging: use entity/technique/rule overlap and temporal proximity.
   */
  private async mergeRelatedCasesDeterministically(): Promise<void> {
    if (!this.clusteringResult || this.clusteringResult.clusters.length < 2) {
      this.logger.debug('Less than 2 clusters, nothing to merge deterministically');
      return;
    }

    const similarityThreshold = this.state.config.groupingConfig.mergeThreshold ?? 0.7;

    // Build similarity inputs for each created case from its cluster
    const caseClusterMap = new Map<string, AlertCluster>();
    for (const cluster of this.clusteringResult.clusters) {
      const alertInCluster = cluster.alertIds[0];
      const decision = this.state.groupingDecisions.find((d) => d.alertId === alertInCluster);
      if (decision?.caseId) {
        caseClusterMap.set(decision.caseId, cluster);
      }
    }

    const caseIds = Array.from(caseClusterMap.keys());
    if (caseIds.length < 2) return;

    this.logger.info(
      `Analyzing ${caseIds.length} cases for deterministic merging (threshold: ${similarityThreshold})`
    );

    await this.findAndMergeCasePairs(
      caseIds,
      similarityThreshold,
      async (caseId1, caseId2) => {
        const cluster1 = caseClusterMap.get(caseId1);
        const cluster2 = caseClusterMap.get(caseId2);
        if (!cluster1 || !cluster2) {
          return { similarity: 0, shouldMerge: false, reason: 'Missing cluster data' };
        }

        const alerts1 = cluster1.alerts ?? [];
        const alerts2 = cluster2.alerts ?? [];

        const case1Title = this.getCaseTitle(caseId1);
        const case2Title = this.getCaseTitle(caseId2);

        const input1 = this.staticAnalysis.buildSimilarityInput(
          caseId1,
          case1Title,
          cluster1,
          alerts1
        );
        const input2 = this.staticAnalysis.buildSimilarityInput(
          caseId2,
          case2Title,
          cluster2,
          alerts2
        );

        return this.staticAnalysis.computeCaseSimilarity(input1, input2, similarityThreshold);
      },
      'deterministic similarity analysis'
    );
  }

  /**
   * Generic helper: find case pairs that should be merged and execute merges.
   */
  private async findAndMergeCasePairs(
    caseIds: string[],
    threshold: number,
    analyzeSimilarity: (
      caseId1: string,
      caseId2: string
    ) => Promise<{ similarity: number; shouldMerge: boolean; reason: string }>,
    analysisMethod: string
  ): Promise<void> {
    const casesToMerge: Array<{
      sourceCaseId: string;
      sourceCaseTitle: string;
      targetCaseId: string;
      targetCaseTitle: string;
      similarity: number;
      reason: string;
    }> = [];

    const mergedIntoCases = new Set<string>();

    this.logger.debug(
      `Analyzing ${caseIds.length} cases for potential merging via ${analysisMethod} (threshold: ${threshold})`
    );

    for (let i = 0; i < caseIds.length; i++) {
      const caseId1 = caseIds[i];
      if (!mergedIntoCases.has(caseId1)) {
        for (let j = i + 1; j < caseIds.length; j++) {
          const caseId2 = caseIds[j];
          if (!mergedIntoCases.has(caseId2)) {
            try {
              const analysis = await analyzeSimilarity(caseId1, caseId2);

              if (analysis.shouldMerge && analysis.similarity >= threshold) {
                const case1Title = this.getCaseTitle(caseId1);
                const case2Title = this.getCaseTitle(caseId2);

                casesToMerge.push({
                  sourceCaseId: caseId2,
                  sourceCaseTitle: case2Title,
                  targetCaseId: caseId1,
                  targetCaseTitle: case1Title,
                  similarity: analysis.similarity,
                  reason: analysis.reason,
                });
                mergedIntoCases.add(caseId2);

                this.logger.info(
                  `Cases will be merged: "${case2Title}" -> "${case1Title}" ` +
                    `(${(analysis.similarity * 100).toFixed(1)}%: ${analysis.reason})`
                );
              }
            } catch (error) {
              this.logger.error(
                `Failed to analyze similarity between ${caseId1} and ${caseId2}: ${error}`
              );
            }
          }
        }
      }
    }

    if (casesToMerge.length === 0) {
      this.logger.debug('No cases found to merge');
      return;
    }

    this.logger.info(`Merging ${casesToMerge.length} case pairs`);

    for (const merge of casesToMerge) {
      try {
        const mergeNote =
          `**Case Merged**: This case was merged with "${merge.sourceCaseTitle}" ` +
          `based on ${analysisMethod}.\n\n` +
          `**Similarity Score**: ${(merge.similarity * 100).toFixed(1)}%\n\n` +
          `**Reason**: ${merge.reason}`;

        if (this.deps.mergeCases) {
          await this.deps.mergeCases(merge.sourceCaseId, merge.targetCaseId, mergeNote);
        }

        this.state.mergedCases.push({
          sourceCaseId: merge.sourceCaseId,
          sourceCaseTitle: merge.sourceCaseTitle,
          targetCaseId: merge.targetCaseId,
          targetCaseTitle: merge.targetCaseTitle,
          reason: merge.reason,
        });
        this.state.metrics.casesMerged++;
      } catch (error) {
        this.logger.error(
          `Failed to merge case ${merge.sourceCaseId} into ${merge.targetCaseId}: ${error}`
        );
        this.state.errors.push(`Failed to merge cases: ${error}`);
      }
    }
  }

  /** Get a case title from existing cases or created cases */
  private getCaseTitle(caseId: string): string {
    const existing = this.state.existingCases.find((c) => c.id === caseId);
    if (existing) return existing.title;

    const created = Array.from(this.state.createdCases.values()).find((c) => c.id === caseId);
    if (created) return created.title;

    return caseId;
  }

  /**
   * Tag processed alerts (excluding alerts that were removed during validation)
   */
  private async tagAlerts(): Promise<void> {
    this.state.currentStep = 'tag_alerts';

    // Get IDs of alerts that were removed during validation
    const removedAlertIds = new Set(this.state.removedAlerts.map((a) => a.alertId));

    const alertsToTag = this.state.groupingDecisions
      .filter((d) => d.caseId && !removedAlertIds.has(d.alertId))
      .map((d) => ({ id: d.alertId, index: d.alertIndex }));

    if (alertsToTag.length === 0) {
      return;
    }

    this.logger.debug(`Tagging ${alertsToTag.length} alerts`);

    try {
      // Bulk update alerts with the llm-triaged tag
      const operations = alertsToTag.flatMap((alert) => [
        { update: { _index: alert.index, _id: alert.id } },
        {
          script: {
            source: `
              if (ctx._source['kibana.alert.workflow_tags'] == null) {
                ctx._source['kibana.alert.workflow_tags'] = [];
              }
              if (!ctx._source['kibana.alert.workflow_tags'].contains(params.tag)) {
                ctx._source['kibana.alert.workflow_tags'].add(params.tag);
              }
            `,
            params: { tag: LLM_TRIAGED_TAG },
          },
        },
      ]);

      await this.esClient.bulk({
        operations,
        refresh: 'wait_for',
      });

      this.state.taggedAlertIds = alertsToTag.map((a) => a.id);
    } catch (error) {
      this.logger.error(`Failed to tag alerts: ${error}`);
      this.state.errors.push(`Failed to tag alerts: ${error}`);
    }
  }

  /**
   * Finalize workflow and return results
   */
  private finalize(): {
    metrics: WorkflowExecutionMetrics;
    dryRunResult?: DryRunResult;
    groupingDecisions: GroupingDecision[];
    clusteringResult?: ClusteringResult;
    removedAlerts: Array<{
      alertId: string;
      alertIndex: string;
      caseId: string;
      reason: string;
    }>;
    mergedCases: Array<{
      sourceCaseId: string;
      sourceCaseTitle: string;
      targetCaseId: string;
      targetCaseTitle: string;
      reason: string;
    }>;
    errors: string[];
  } {
    this.state.currentStep = 'complete';
    this.state.metrics.durationMs = Date.now() - this.startTime;

    this.logger.info(
      `Workflow completed: processed ${this.state.metrics.alertsProcessed} alerts, ` +
        `grouped ${this.state.metrics.alertsGrouped}, created ${this.state.metrics.casesCreated} cases, ` +
        `updated ${this.state.metrics.casesUpdated} cases, ` +
        `removed ${this.state.metrics.alertsRemovedFromCases} alerts from cases, ` +
        `merged ${this.state.metrics.casesMerged} cases, ` +
        `${this.state.errors.length} errors`
    );

    return {
      metrics: this.state.metrics,
      dryRunResult: this.state.dryRunResult,
      groupingDecisions: this.state.groupingDecisions,
      clusteringResult: this.clusteringResult,
      removedAlerts: this.state.removedAlerts,
      mergedCases: this.state.mergedCases,
      errors: this.state.errors,
    };
  }
}
