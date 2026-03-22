/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph } from '@langchain/langgraph';
import type { Logger } from '@kbn/core/server';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';

import { getInvestigationGraphAnnotation } from './state';
import {
  createTriageNode,
  createMitreNode,
  createCTINode,
  createInvestigationNode,
  createRemediationNode,
} from './nodes';
import type { Alert, InvestigationResult } from '../../types';
import { formatInvestigationAsMarkdown } from '../../helpers';

/**
 * Create Investigation Graph
 *
 * LangGraph workflow that coordinates 5 agents with parallel execution:
 * 1. Triage Agent - Classify severity and attack type (sequential)
 * 2. MITRE Mapper - Map to ATT&CK framework (sequential)
 * 3. CTI Enrichment - Threat intelligence lookup (parallel)
 * 4. Investigation - Deep analysis with hypothesis testing (parallel with CTI)
 * 5. Remediation - Response action recommendations (sequential after 3-4)
 *
 * Production System: Full 5-agent implementation with parallel execution
 */
export const createInvestigationGraph = ({
  llmClient,
  esClient,
  logger,
  enabledAgents = {
    triage: true,
    mitre: true,
    cti: true,
    investigation: true,
    remediation: true,
  },
}: {
  llmClient: ActionsClientLlm;
  esClient: ElasticsearchClient;
  logger: Logger;
  enabledAgents?: {
    triage?: boolean;
    mitre?: boolean;
    cti?: boolean;
    investigation?: boolean;
    remediation?: boolean;
  };
}) => {
  // Define state annotation
  const graphState = getInvestigationGraphAnnotation();

  // Create graph
  const workflow = new StateGraph(graphState);

  logger.info(
    `[Graph] Creating investigation graph with agents: ${JSON.stringify(enabledAgents)}`
  );

  // Create nodes (always create, conditionally add to graph)
  const triageNode = createTriageNode(llmClient, esClient, logger);
  const mitreNode = createMitreNode(llmClient, logger);
  const ctiNode = createCTINode(llmClient, esClient, logger);
  const investigationNode = createInvestigationNode(llmClient, esClient, logger);
  const remediationNode = createRemediationNode(llmClient, logger);

  // Phase 1: Triage (always runs first)
  // Note: Use different node names than state fields to avoid LangGraph naming conflict
  if (enabledAgents.triage !== false) {
    workflow.addNode('triageNode', triageNode);
    workflow.addEdge('__start__', 'triageNode');
  }

  // Phase 2: MITRE (runs after triage)
  if (enabledAgents.mitre !== false) {
    workflow.addNode('mitreNode', mitreNode);
    workflow.addEdge(enabledAgents.triage !== false ? 'triageNode' : '__start__', 'mitreNode');
  }

  // Phase 3: CTI + Investigation (run in PARALLEL after MITRE)
  const parallelAgents: string[] = [];
  const lastSequentialNode = enabledAgents.mitre !== false ? 'mitreNode' : enabledAgents.triage !== false ? 'triageNode' : '__start__';

  if (enabledAgents.cti !== false) {
    workflow.addNode('ctiNode', ctiNode);
    workflow.addEdge(lastSequentialNode, 'ctiNode'); // MITRE → CTI
    parallelAgents.push('ctiNode');
  }

  if (enabledAgents.investigation !== false) {
    workflow.addNode('investigationNode', investigationNode);
    workflow.addEdge(lastSequentialNode, 'investigationNode'); // MITRE → Investigation (parallel with CTI)
    parallelAgents.push('investigationNode');
  }

  // Phase 4: Remediation (runs after BOTH CTI and Investigation complete)
  if (enabledAgents.remediation !== false) {
    workflow.addNode('remediationNode', remediationNode);

    if (parallelAgents.length > 0) {
      // Remediation waits for all parallel agents to complete
      parallelAgents.forEach((parallelAgent) => {
        workflow.addEdge(parallelAgent, 'remediationNode');
      });
    } else {
      workflow.addEdge(lastSequentialNode, 'remediationNode');
    }

    workflow.addEdge('remediationNode', '__end__');
  } else {
    // If no remediation, end after parallel agents (or last sequential)
    if (parallelAgents.length > 0) {
      parallelAgents.forEach((parallelAgent) => {
        workflow.addEdge(parallelAgent, '__end__');
      });
    } else {
      workflow.addEdge(lastSequentialNode, '__end__');
    }
  }

  logger.info(`[Graph] Graph created with execution flow: ${enabledAgents.triage !== false ? 'Triage → ' : ''}${enabledAgents.mitre !== false ? 'MITRE → ' : ''}${parallelAgents.length > 0 ? `[${parallelAgents.map(n => n.replace('Node', '')).join(' || ')}] → ` : ''}${enabledAgents.remediation !== false ? 'Remediation' : 'END'}`);

  // Compile graph
  return workflow.compile();
};

/**
 * Execute Investigation
 *
 * Main entry point for alert investigation with full 5-agent system
 */
export const executeInvestigation = async ({
  alert,
  caseId,
  llmClient,
  esClient,
  logger,
  enabledAgents,
}: {
  alert: Alert;
  caseId?: string;
  llmClient: ActionsClientLlm;
  esClient: ElasticsearchClient;
  logger: Logger;
  enabledAgents?: {
    triage?: boolean;
    mitre?: boolean;
    cti?: boolean;
    investigation?: boolean;
    remediation?: boolean;
  };
}): Promise<InvestigationResult> => {
  const startTime = Date.now();

  const agentsConfig = {
    triage: enabledAgents?.triage !== false, // Default: true
    mitre: enabledAgents?.mitre !== false, // Default: true
    cti: enabledAgents?.cti ?? true, // Default: true
    investigation: enabledAgents?.investigation ?? true, // Default: true
    remediation: enabledAgents?.remediation ?? true, // Default: true
  };

  logger.info(
    `[Investigation] Starting investigation for alert ${alert._id} with agents: ${Object.entries(agentsConfig).filter(([_, enabled]) => enabled).map(([name]) => name).join(', ')}`
  );

  try {
    // Create and execute graph with enabled agents
    const graph = createInvestigationGraph({
      llmClient,
      esClient,
      logger,
      enabledAgents: agentsConfig,
    });

    const finalState = await graph.invoke({
      alert,
      caseId,
      startTime,
    });

    const latencyMs = Date.now() - startTime;

    // Build result with all agent outputs
    const result: InvestigationResult = {
      alertId: alert._id,
      caseId,
      timestamp: new Date().toISOString(),
      triage: finalState.triage,
      mitreMapping: finalState.mitreMapping,
      ctiContext: finalState.ctiContext,
      investigation: finalState.investigation,
      remediation: finalState.remediation,
      investigationText: '',
      latencyMs,
      agentLatencies: finalState.agentLatencies,
    };

    // Format as markdown
    result.investigationText = formatInvestigationAsMarkdown(result);

    const completedAgents = Object.entries(agentsConfig)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    logger.info(
      `[Investigation] Completed in ${latencyMs}ms with ${completedAgents.length} agents - ${finalState.triage?.classification || 'N/A'} - ${finalState.mitreMapping?.techniques.length || 0} MITRE techniques - ${finalState.ctiContext?.iocs.length || 0} IOCs analyzed`
    );

    // Log per-agent latencies
    if (result.agentLatencies) {
      const latencyBreakdown = Object.entries(result.agentLatencies)
        .map(([agent, ms]) => `${agent}: ${ms}ms`)
        .join(', ');
      logger.info(`[Investigation] Agent latencies: ${latencyBreakdown}`);
    }

    // Check for errors
    if (finalState.errors.length > 0) {
      logger.warn(
        `[Investigation] Completed with errors: ${finalState.errors.join(', ')}`
      );
    }

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error(`[Investigation] Failed after ${latencyMs}ms: ${error.message}`);

    throw new Error(`Investigation failed: ${error.message}`);
  }
};
