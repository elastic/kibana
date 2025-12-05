/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';

/**
 * Base dataset example structure compatible with Phoenix
 */
export interface BaseDatasetExample extends Example {
  metadata?: {
    dataset_split?: string[];
    [key: string]: unknown;
  };
}

/**
 * Alerts RAG regression dataset example
 * Used for evaluating Security AI Assistant responses about alerts
 */
export interface AlertsRagExample extends BaseDatasetExample {
  input: {
    /** The user's question about alerts */
    question: string;
  };
  output: {
    /** Expected reference answer for comparison */
    reference?: string;
    /** Criteria for LLM-as-a-judge evaluation */
    criteria?: string[];
  };
}

/**
 * Attack Discovery dataset example
 * Used for evaluating Attack Discovery graph outputs
 */
export interface AttackDiscoveryExample extends BaseDatasetExample {
  input: {
    /** The user's question or instruction */
    input?: string;
    /** Optional graph state overrides for seeding the evaluation */
    overrides?: {
      anonymizedAlerts?: Array<{
        pageContent: string;
        metadata: Record<string, unknown>;
      }>;
      anonymizedDocuments?: Array<{
        pageContent: string;
        metadata: Record<string, unknown>;
      }>;
      replacements?: Record<string, string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  output: {
    /** Expected reference answer */
    reference?: string;
    /** Expected attack discovery insights */
    expectedInsights?: Array<{
      title: string;
      alertIds?: string[];
      detailsMarkdown?: string;
      entitySummaryMarkdown?: string;
      summaryMarkdown?: string;
    }>;
  };
}

/**
 * Custom Knowledge dataset example
 * Used for evaluating Knowledge Base integration with the AI Assistant
 */
export interface CustomKnowledgeExample extends BaseDatasetExample {
  input: {
    /** The user's question about saved knowledge */
    question: string;
  };
  output: {
    /** Expected reference answer based on knowledge base content */
    reference?: string;
    /** Criteria for LLM-as-a-judge evaluation */
    criteria?: string[];
  };
}

/**
 * ES|QL Generation dataset example
 * Used for evaluating ES|QL query generation
 */
export interface EsqlExample extends BaseDatasetExample {
  input: {
    /** The user's request describing the desired ES|QL query */
    question: string;
  };
  output: {
    /** Expected reference ES|QL query */
    reference?: string;
    /** Criteria for LLM-as-a-judge evaluation */
    criteria?: string[];
  };
}

/**
 * Defend Insights event structure
 */
export interface DefendInsightEventExample {
  /** The event's ID */
  id: string;
  /** The endpoint ID associated with this event */
  endpointId: string;
  /** The event's value */
  value: string;
}

/**
 * Defend Insights remediation structure
 */
export interface DefendInsightRemediationExample {
  /** The remediation message explaining how to fix the issue */
  message: string;
  /** Optional link to documentation */
  link?: string;
}

/**
 * Defend Insight structure for dataset examples
 */
export interface DefendInsightExample {
  /** The group category of the events (ie. Windows Defender) */
  group: string;
  /** The events associated with this insight */
  events: DefendInsightEventExample[];
  /** Remediation information */
  remediation: DefendInsightRemediationExample;
}

/**
 * Defend Insights dataset example
 * Used for evaluating Defend Insights graph outputs (policy response failures, etc.)
 */
export interface DefendInsightsExample extends BaseDatasetExample {
  input: {
    /** The endpoint IDs to analyze */
    endpointIds?: string[];
    /** The type of insight to generate */
    insightType?: 'incompatible_antivirus' | 'noisy_process_tree' | 'policy_response_failure';
    /** Optional graph state overrides for seeding the evaluation */
    overrides?: {
      anonymizedEvents?: Array<{
        pageContent: string;
        metadata: Record<string, unknown>;
      }>;
      replacements?: Record<string, string>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  output: {
    /** Expected defend insights */
    insights: DefendInsightExample[];
    /** Expected reference answer */
    reference?: string;
  };
}

/**
 * Dataset definition with typed examples
 */
export interface Dataset<T extends BaseDatasetExample> {
  name: string;
  description: string;
  examples: T[];
}

/**
 * JSON file structure for datasets
 * This matches the structure expected when importing JSON files
 */
export interface DatasetJson<T extends BaseDatasetExample = BaseDatasetExample> {
  name: string;
  description: string;
  examples: T[];
}
