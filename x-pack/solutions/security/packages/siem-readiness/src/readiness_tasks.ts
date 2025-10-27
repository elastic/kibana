/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type ReadinessTaskId =
  | 'lets-get-started'
  | 'enable-endpoint-visibility'
  | 'ingest-cloud-audit-logs'
  | 'ingest-asset-inventory'
  | 'enable-kubernetes-container-logs'
  | 'ingest-all-cloud-logs-inventory'
  | 'enable-mitre-aligned-detection-rules'
  | 'view-detection-coverage-mitre'
  | 'add-threat-intel-feeds'
  | 'customize-create-rules'
  | 'use-attack-discovery'
  | 'maintain-rule-coverage'
  | 'enable-cspm-on-all-clouds'
  | 'investigate-alert-using-timeline'
  | 'use-ai-assistant-for-alert-root-cause'
  | 'add-external-connectors'
  | 'automate-response-rules-case-creation'
  | 'create-manage-case-workflows'
  | 'complete-automated-cases';

export interface ReadinessTaskConfig {
  id: ReadinessTaskId;
  title: string;
  description: string;
  pillar: 'visibility' | 'detection' | 'response';
  order: number;
  taskNumber: string;
  meta?: Record<string, unknown>;
}

// Used to define and validate readiness tasks structure
export const READINESS_TASKS: ReadinessTaskConfig[] = [
  /**
   *  ### Visibility Pillar Tasks ###
   */
  {
    // Completion: User selects their infrastructure platforms for tailored recommendations
    id: 'lets-get-started',
    title: i18n.translate('xpack.securitySolution.readinessTask.letsGetStarted.title', {
      defaultMessage: 'Lets get started',
    }),
    description: i18n.translate('xpack.securitySolution.readinessTask.letsGetStarted.description', {
      defaultMessage:
        'To complete this task, we need a bit more information about your infrastructure. Select the platforms you use (e.g. AWS, Azure, GCP, On-prem). This helps us tailor recommendations and accurately measure your readiness.',
    }),
    pillar: 'visibility',
    order: 1,
    taskNumber: '1',
  },
  {
    // Completion: Elastic Defend agent running (healthy) or 3rd-party endpoint logs successfully ingested
    id: 'enable-endpoint-visibility',
    title: i18n.translate('xpack.securitySolution.readinessTask.enableEndpointVisibility.title', {
      defaultMessage: 'Enable Endpoint Visibility',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.enableEndpointVisibility.description',
      {
        defaultMessage: `Choose one of the following:
  1. Deploy Elastic Defend to gain rich host and process telemetry
  2. Ingest logs from existing endpoint protection tools (e.g. CrowdStrike, SentinelOne, Microsoft Defender) using supported integrations.
This enables foundational endpoint visibility for investigation and detection.`,
      }
    ),
    pillar: 'visibility',
    order: 2,
    taskNumber: '2',
  },
  {
    // Completion: Events successfully ingested from at least one cloud provider (AWS/GCP/Azure/On-Prem)
    id: 'ingest-cloud-audit-logs',
    title: i18n.translate('xpack.securitySolution.readinessTask.ingestCloudAuditLogs.title', {
      defaultMessage: 'Ingest cloud/audit logs (AWS, GCP, Azure, On prem)',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.ingestCloudAuditLogs.description',
      {
        defaultMessage:
          'Set up integrations for AWS CloudTrail, Azure Activity, GCP Admin Activity, or on-prem audit logs',
      }
    ),
    pillar: 'visibility',
    order: 3,
    taskNumber: '3',
  },
  {
    // Completion: Cloud asset inventory indexed or visible in Inventory dashboard
    id: 'ingest-asset-inventory',
    title: i18n.translate('xpack.securitySolution.readinessTask.ingestAssetInventory.title', {
      defaultMessage: 'Ingest asset inventory',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.ingestAssetInventory.description',
      {
        defaultMessage:
          'Automatically pull and index asset metadata from cloud (via integrations) or via endpoint agent. View in Asset Inventory dashboard',
      }
    ),
    pillar: 'visibility',
    order: 7,
    taskNumber: '4',
  },
  {
    // Completion: Ingested logs from container/k8s integration
    id: 'enable-kubernetes-container-logs',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.enableKubernetesContainerLogs.title',
      {
        defaultMessage: 'Enable Kubernetes or container logs',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.enableKubernetesContainerLogs.description',
      {
        defaultMessage:
          'Set up the Kubernetes integration for kubernetes.audit_logs and/or container runtime logs.',
      }
    ),
    pillar: 'visibility',
    order: 11,
    taskNumber: '5',
  },
  {
    // Completion: Logs + asset data present from AWS, Azure, and GCP (dynamic based on Asset Inventory/Entity store)
    id: 'ingest-all-cloud-logs-inventory',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.ingestAllCloudLogsInventory.title',
      {
        defaultMessage:
          'Ingest all 3 major cloud providers (AWS, Azure, GCP) logs and Cloud Asset Inventory',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.ingestAllCloudLogsInventory.description',
      {
        defaultMessage:
          'Onboard audit + inventory data for AWS, Azure, and GCP to show multi-cloud coverage.',
      }
    ),
    pillar: 'visibility',
    order: 16,
    taskNumber: '6',
  },

  /**
   *  ### Detection Pillar Tasks ###
   */
  {
    // Completion: High-severity MITRE rules enabled and firing
    id: 'enable-mitre-aligned-detection-rules',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.enableMitreAlignedDetectionRules.title',
      {
        defaultMessage: 'Enable MITRE-aligned detection rules',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.enableMitreAlignedDetectionRules.description',
      {
        defaultMessage:
          "Enable Elastic's prebuilt rules mapped to MITRE ATT&CK. Evaluate rule coverage across key tactics.",
      }
    ),
    pillar: 'detection',
    order: 4,
    taskNumber: '1',
  },
  {
    // Completion: Coverage page visited
    id: 'view-detection-coverage-mitre',
    title: i18n.translate('xpack.securitySolution.readinessTask.viewDetectionCoverageMitre.title', {
      defaultMessage: 'View detection coverage across MITRE matrix',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.viewDetectionCoverageMitre.description',
      {
        defaultMessage:
          'Show tactics and techniques covered by active rules in a heatmap. Track posture',
      }
    ),
    pillar: 'detection',
    order: 5,
    taskNumber: '2',
  },
  {
    // Completion: Threat feed events ingested and alerts enriched
    id: 'add-threat-intel-feeds',
    title: i18n.translate('xpack.securitySolution.readinessTask.addThreatIntelFeeds.title', {
      defaultMessage: 'Add threat intelligence feeds',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.addThreatIntelFeeds.description',
      {
        defaultMessage:
          'Integrate threat intel (Abuse.ch, etc.) to enrich alerts and correlate known IOCs.',
      }
    ),
    pillar: 'detection',
    order: 8,
    taskNumber: '3',
  },
  {
    // Completion: A new or edited rule has been enabled
    id: 'customize-create-rules',
    title: i18n.translate('xpack.securitySolution.readinessTask.customizeCreateRules.title', {
      defaultMessage: 'Customize or create new detection rules',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.customizeCreateRules.description',
      {
        defaultMessage:
          'Modify a rule or author a new one using KQL/ES QL. Demonstrates SOC maturity.',
      }
    ),
    pillar: 'detection',
    order: 9,
    taskNumber: '4',
  },
  {
    // Completion: Activity like running Attack Discovery multiple times or scheduling action on the Attack Discovery page
    id: 'use-attack-discovery',
    title: i18n.translate('xpack.securitySolution.readinessTask.useAttackDiscovery.title', {
      defaultMessage: 'Use Attack Discovery to trace MITRE-mapped threat activity',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.useAttackDiscovery.description',
      {
        defaultMessage:
          'Visualize threats in MITRE ATT&CK graph via Attack Discovery. Correlates alerts to kill chain.',
      }
    ),
    pillar: 'detection',
    order: 12,
    taskNumber: '5',
  },
  {
    // Completion: >90% of relevant MITRE techniques covered by tuned rules
    id: 'maintain-rule-coverage',
    title: i18n.translate('xpack.securitySolution.readinessTask.maintainRuleCoverage.title', {
      defaultMessage: 'Maintain >90% rule coverage',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.maintainRuleCoverage.description',
      {
        defaultMessage: 'Ensure high-severity rules are enabled',
      }
    ),
    pillar: 'detection',
    order: 14,
    taskNumber: '6',
  },
  {
    // Completion: CSPM enabled for AWS, Azure, and GCP, findings/dashboard pages visited (dynamic based on CSP footprint)
    id: 'enable-cspm-on-all-clouds',
    title: i18n.translate('xpack.securitySolution.readinessTask.enableCspmOnAllClouds.title', {
      defaultMessage: 'Enable CSPM on all 3 major cloud providers (AWS, Azure, GCP)',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.enableCspmOnAllClouds.description',
      {
        defaultMessage:
          'Activate cloud security posture monitoring (CSPM) for AWS, Azure, GCP. Review active findings.',
      }
    ),
    pillar: 'detection',
    order: 17,
    taskNumber: '7',
  },

  /**
   *  ### Response Pillar Tasks ###
   */
  {
    // Completion: Alert annotated, tagged, or enriched in Timeline
    id: 'investigate-alert-using-timeline',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.investigateAlertUsingTimeline.title',
      {
        defaultMessage: 'Investigate an alert using Timeline',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.investigateAlertUsingTimeline.description',
      {
        defaultMessage: 'Triage an alert using the Timeline view. Add evidence and enrich context.',
      }
    ),
    pillar: 'response',
    order: 6,
    taskNumber: '1',
  },
  {
    // Completion: Summary generated on Alert - AI assistant workflow
    id: 'use-ai-assistant-for-alert-root-cause',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.useAiAssistantForAlertRootCause.title',
      {
        defaultMessage: 'Use AI Assistant to summarize alert context or identify root cause',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.useAiAssistantForAlertRootCause.description',
      {
        defaultMessage:
          'Ask AI to generate a quick summary or root cause for an alert. Prompt: "Summarize the root cause for this alert"',
      }
    ),
    pillar: 'response',
    order: 10,
    taskNumber: '2',
  },
  {
    // Completion: Jira/Slack/ServiceNow/SentinelOne/Crowdstrike connector tested and in use
    id: 'add-external-connectors',
    title: i18n.translate('xpack.securitySolution.readinessTask.addExternalConnectors.title', {
      defaultMessage: 'Add external connectors (Jira, Slack, ServiceNow)',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.addExternalConnectors.description',
      {
        defaultMessage: 'Configure Jira, Slack, or ServiceNow for alert or case forwarding.',
      }
    ),
    pillar: 'response',
    order: 13,
    taskNumber: '3',
  },
  {
    // Completion: At least one rule creates a case or sends notification automatically
    id: 'automate-response-rules-case-creation',
    title: i18n.translate(
      'xpack.securitySolution.readinessTask.automateResponseRulesCaseCreation.title',
      {
        defaultMessage: 'Automate response rules or case creation for alerts',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.automateResponseRulesCaseCreation.description',
      {
        defaultMessage:
          'Use rule actions or case templates to automatically trigger cases or actions',
      }
    ),
    pillar: 'response',
    order: 15,
    taskNumber: '4',
  },
  {
    // Completion: Multiple alerts triaged and closed via case workflow
    id: 'create-manage-case-workflows',
    title: i18n.translate('xpack.securitySolution.readinessTask.createManageCaseWorkflows.title', {
      defaultMessage: 'Create and manage case workflows',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.createManageCaseWorkflows.description',
      {
        defaultMessage:
          'Open a case, assign it, and link alerts to it. Manages SOC workflow maturity.',
      }
    ),
    pillar: 'response',
    order: 18,
    taskNumber: '5',
  },
  {
    // Completion: 3+ cases with automation and alert linkages resolved
    id: 'complete-automated-cases',
    title: i18n.translate('xpack.securitySolution.readinessTask.completeAutomatedCases.title', {
      defaultMessage: 'Complete 3+ cases with automation and external sharing',
    }),
    description: i18n.translate(
      'xpack.securitySolution.readinessTask.completeAutomatedCases.description',
      {
        defaultMessage: 'Demonstrate workflow maturity by automating and resolving multiple cases.',
      }
    ),
    pillar: 'response',
    order: 19,
    taskNumber: '6',
  },
] as const;
