/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  OBSERVABILITY_GET_HOSTS_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
} from '../../tools';
import {
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
} from '../../tools/get_metric_change_points/tool';
import {
  OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
} from '../../tools/get_trace_change_points/tool';

export const infrastructureAlertingSkill = defineSkillType({
  id: 'infrastructure-alerting',
  name: 'infrastructure-alerting',
  basePath: 'skills/observability/infrastructure',
  description:
    'Infrastructure monitoring and alert investigation: analyze host metrics (CPU, memory, disk, network), ' +
    'triage observability alerts, review ML anomaly detection jobs, and detect metric/trace change points. ' +
    'Use when investigating host resource issues, triaging alert queues, or analyzing metric anomalies.',
  content: `# Infrastructure & Alerting Guide

## When to Use This Skill

Use this skill when:
- Investigating host-level resource issues (CPU saturation, memory pressure, disk full)
- Triaging observability alerts to determine severity and required action
- Reviewing ML anomaly detection job results for unusual patterns
- Detecting change points in infrastructure metrics or trace performance
- Correlating infrastructure events with application-level symptoms

## Investigation Workflow

### 1. Alert Triage
- Use 'observability.get_alerts' to fetch active and recent alerts
- Assess: severity, affected entity (service, host), rule name, and trigger time
- Group related alerts by entity or time window to identify incident scope
- Determine priority: critical infrastructure alerts before warning-level metrics

### 2. Host Investigation
- Use 'observability.get_hosts' to list hosts and their key metrics
- Check: CPU usage, memory usage, disk I/O, network throughput, load average
- Compare current metrics against historical baselines
- Use kqlFilter to scope to specific host groups, cloud providers, or kubernetes clusters
- Identify resource saturation patterns (CPU >90%, memory >85%, disk >90%)

### 3. Anomaly Detection
- Use 'observability.get_anomaly_detection_jobs' to review configured ML jobs
- Check job health: are jobs running, what's the latest bucket time?
- Review anomaly records for statistically significant deviations
- Correlate ML anomalies with alerts and infrastructure metric changes

### 4. Change Point Detection
- Use 'observability.get_metric_change_points' for infrastructure metric shifts
- Use 'observability.get_trace_change_points' for application performance shifts
- Change points pinpoint when behavior changed — correlate with deployments, config changes, or external events
- Look for concurrent change points across multiple metrics (indicates systemic change)

### 5. Synthesis
- Correlate infrastructure metrics with application performance (use service-investigation skill if needed)
- Establish timeline: infrastructure issue → application impact → alert trigger
- Distinguish between: resource exhaustion, noisy neighbor, configuration drift, and capacity planning issues
- Recommend: scaling actions, alert tuning, anomaly detection job adjustments, or deeper investigation

## Entity Linking
When referencing entities, use markdown links for quick navigation:
- Host: [hostname](/app/metrics/detail/host/hostname)
- Alert: [alertId](/app/observability/alerts/alertId)
- Alert Rule: [ruleId](/app/observability/alerts/rules/ruleId)

## Best Practices
- Be quantitative: cite specific CPU%, memory MB, disk IOPS — avoid vague "high"
- Check multiple signal types: alerts + host metrics + ML anomalies = stronger diagnosis
- Consider all infrastructure layers: compute → storage → network → dependencies
- Correlate infrastructure changes with deployment or configuration events
- Use change point timestamps to narrow investigation windows precisely`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'alert-triage-workflow',
      content: `# Alert Triage Workflow

1. \`observability.get_alerts\` with start=now-1h — fetch recent alerts
2. Group by affected entity and severity
3. For host alerts: \`observability.get_hosts\` with hostName filter — check resource metrics
4. For metric anomalies: \`observability.get_anomaly_detection_jobs\` — review ML job results
5. \`observability.get_metric_change_points\` — find when metrics shifted
6. Cross-reference with service-investigation or log-analysis skills as needed`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getDocumentById,
    OBSERVABILITY_GET_ALERTS_TOOL_ID,
    OBSERVABILITY_GET_HOSTS_TOOL_ID,
    OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
    OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
    OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
  ],
});
