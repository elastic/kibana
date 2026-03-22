/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Core types for LLM-Powered Alert Investigation
 *
 * Foundation Spike: 2 agents (Triage + MITRE Mapper)
 */

/**
 * Input alert from Elasticsearch
 * Simplified type for spike - use minimal fields needed for investigation
 */
export interface Alert {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    'kibana.alert.rule.name'?: string;
    'kibana.alert.severity'?: string;
    'kibana.alert.risk_score'?: number;
    'kibana.alert.rule.description'?: string;
    'process.name'?: string;
    'process.command_line'?: string;
    'user.name'?: string;
    'host.name'?: string;
    'source.ip'?: string;
    'destination.ip'?: string;
    'file.path'?: string;
    'event.category'?: string[];
    'event.type'?: string[];
    'event.action'?: string;
    // Allow additional fields
    [key: string]: unknown;
  };
}

/**
 * Triage Agent Result
 *
 * Classifies alert severity and attack type
 */
export interface TriageResult {
  classification: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  attackType:
    | 'Malware'
    | 'Phishing'
    | 'Lateral Movement'
    | 'C2'
    | 'Exfiltration'
    | 'Brute Force'
    | 'Unknown';
  confidence: number; // 0-100
  reasoning: string; // LLM's reasoning
  similarAlertsCount?: number; // How many similar alerts found
}

/**
 * MITRE ATT&CK Technique Mapping
 */
export interface MitreTechnique {
  id: string; // e.g., "T1059.001"
  name: string; // e.g., "PowerShell"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * MITRE ATT&CK Tactic
 */
export interface MitreTactic {
  id: string; // e.g., "TA0002"
  name: string; // e.g., "Execution"
}

/**
 * MITRE Mapper Agent Result
 *
 * Maps alert to MITRE ATT&CK framework
 */
export interface MitreMapping {
  techniques: MitreTechnique[];
  tactics: MitreTactic[];
  phase: string; // e.g., "Execution", "Initial Access"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
  attackNavigatorLayer?: Record<string, unknown>; // ATT&CK Navigator JSON
}

/**
 * Complete Investigation Result
 *
 * Combines all agent outputs
 */
export interface InvestigationResult {
  alertId: string;
  caseId?: string;
  timestamp: string;
  triage?: TriageResult;
  mitreMapping?: MitreMapping;
  ctiContext?: any; // CTIContext from cti_enrichment_agent
  investigation?: any; // InvestigationAnalysis from investigation_agent
  remediation?: any; // RemediationRecommendation from remediation_agent
  investigationText: string; // Formatted markdown for case comment
  latencyMs: number; // Total investigation time
  agentLatencies?: {
    // Per-agent latency breakdown
    triage?: number;
    mitre?: number;
    cti?: number;
    investigation?: number;
    remediation?: number;
  };
}

/**
 * Investigation State (for LangGraph)
 *
 * Maintains state as investigation progresses through agents
 */
export interface InvestigationState {
  alert: Alert;
  caseId?: string;
  triage?: TriageResult;
  mitreMapping?: MitreMapping;
  ctiContext?: any; // CTIContext from cti_enrichment_agent
  investigation?: any; // InvestigationAnalysis from investigation_agent
  remediation?: any; // RemediationRecommendation from remediation_agent
  errors: string[];
  startTime: number;
}
