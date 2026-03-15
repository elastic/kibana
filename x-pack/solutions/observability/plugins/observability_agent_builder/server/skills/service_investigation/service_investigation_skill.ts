/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
  OBSERVABILITY_GET_TRACES_TOOL_ID,
  OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
  OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
} from '../../tools';

export const serviceInvestigationSkill = defineSkillType({
  id: 'service-investigation',
  name: 'service-investigation',
  basePath: 'skills/observability/services',
  description:
    'APM service investigation: discover services, analyze latency/throughput/error rate metrics, ' +
    'inspect distributed traces, examine runtime metrics (JVM, Go, .NET), and map service dependencies. ' +
    'Use when diagnosing service performance issues, tracing requests across microservices, or understanding service topology.',
  content: `# Service Investigation Guide

## When to Use This Skill

Use this skill when:
- Investigating service performance degradation (high latency, error spikes, throughput drops)
- Tracing requests across distributed microservices to find bottlenecks
- Analyzing runtime metrics (JVM heap, GC, Go goroutines, .NET thread pool) for resource issues
- Mapping service dependencies to understand blast radius of an incident
- Comparing service metrics across time periods to identify regressions

## Investigation Workflow

### 1. Service Discovery
- Start with 'observability.get_services' to list all instrumented services and their health
- Review key metrics: latency (ms), throughput (tpm), failure rate (0-1)
- Identify services with anomalous metrics compared to their baselines
- Use kqlFilter to scope to specific environments (e.g., production)

### 2. Service Metrics Deep Dive
- Use 'observability.get_trace_metrics' to drill into a specific service's transaction metrics
- Group by transaction name to find the slowest or most error-prone endpoints
- Compare current metrics against historical baselines (use different time ranges)
- Check failure rate: values above 0.05 (5%) typically warrant investigation

### 3. Distributed Trace Analysis
- Use 'observability.get_traces' to find sample traces for problematic transactions
- Look for: slow spans, error spans, high span count (N+1 queries), missing spans (dropped traces)
- Follow the trace across services to identify where latency is introduced
- Pay attention to span.destination.service.resource for dependency bottlenecks

### 4. Runtime Metrics
- Use 'observability.get_runtime_metrics' to check application-level resource usage
- JVM: heap usage, GC pause time, thread count
- Go: goroutine count, heap allocation rate
- .NET: thread pool queue length, GC generation sizes
- Correlate runtime anomalies with service metric degradation

### 5. Dependency Analysis
- Use 'observability.get_service_topology' to map upstream and downstream dependencies
- Identify: which services call the affected service, which services it depends on
- Check dependency metrics (latency, error rate) to determine if the issue originates upstream or downstream
- Use this to establish blast radius and prioritize remediation

### 6. Synthesis
- Distinguish the SOURCE (where the problem started) from AFFECTED services (impacted downstream)
- Correlate timeline: what changed before symptoms appeared?
- Provide quantitative evidence: cite specific metrics, trace IDs, and time ranges
- Recommend next steps: check infrastructure, review recent deployments, examine logs

## Metric Format Reference
- **Latency**: milliseconds (ms)
- **Throughput**: transactions per minute (tpm)
- **Failure rate**: 0-1 scale (e.g., 0.05 = 5% failure rate)

## Best Practices
- Always start broad (service list) then narrow (specific transactions, traces)
- Quote specific numbers — avoid vague terms like "high" without metric values
- Use kqlFilter with 'service.environment: production' to focus on production issues
- Check multiple signal types before concluding: metrics + traces + runtime = stronger signal
- Consider all layers: infrastructure → application → dependencies`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'service-health-check',
      content: `# Service Health Check Pattern

Start with broad service discovery, then drill into specific services:

1. \`observability.get_services\` with start=now-1h, end=now
2. For unhealthy services: \`observability.get_trace_metrics\` with serviceName=<name>, groupBy=transaction.name
3. For slow transactions: \`observability.get_traces\` with serviceName=<name>, transactionName=<name>
4. For dependency issues: \`observability.get_service_topology\` with serviceName=<name>`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    OBSERVABILITY_GET_SERVICES_TOOL_ID,
    OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
    OBSERVABILITY_GET_TRACES_TOOL_ID,
    OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
    OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
  ],
});
