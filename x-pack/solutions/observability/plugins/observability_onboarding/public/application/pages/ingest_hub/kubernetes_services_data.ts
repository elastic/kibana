/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const K8S = 'https://raw.githubusercontent.com/elastic/integrations/main/packages/kubernetes/img';

export type K8sCategory =
  | 'Workloads'
  | 'Infrastructure'
  | 'Networking'
  | 'Security'
  | 'Performance';

export const K8S_CATEGORY_COLORS: Record<K8sCategory, string> = {
  Workloads: 'default',
  Infrastructure: 'default',
  Networking: 'default',
  Security: 'default',
  Performance: 'default',
};

export interface K8sComponent {
  id: string;
  name: string;
  logoUrl: string;
  category: K8sCategory;
  useCase: string;
  description: string;
  badge?: string;
}

export const K8S_COMPONENTS: K8sComponent[] = [
  {
    id: 'k8s_pods',
    name: 'Kubernetes Pods',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Monitor pod restarts, OOM kills & container resource usage',
    description:
      'Detect crash-looping containers, OOM-killed pods, and CPU/memory saturation before they affect application availability.',
  },
  {
    id: 'k8s_deployments',
    name: 'Kubernetes Deployments',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Verify replica counts, rollout progress & availability',
    description:
      'Track desired vs. running replicas, catch failed rollouts early, and get alerted when availability drops below threshold.',
  },
  {
    id: 'k8s_statefulsets',
    name: 'Kubernetes StatefulSets',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Monitor ordered pod scaling & persistent storage health',
    description:
      'Identify stalled rollouts, unready replicas, and storage claims that block StatefulSet scaling.',
  },
  {
    id: 'k8s_daemonsets',
    name: 'Kubernetes DaemonSets',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Ensure required pods run on every scheduled node',
    description:
      'Alert when DaemonSet pods are missing from nodes or mismatch between desired and scheduled counts.',
  },
  {
    id: 'k8s_jobs',
    name: 'Kubernetes Jobs & CronJobs',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Track batch job completion rates & failure counts',
    description:
      'Monitor job success/failure ratios and active CronJob schedules to catch silent batch failures early.',
  },
  {
    id: 'k8s_container_logs',
    name: 'Container Logs',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Workloads',
    useCase: 'Collect stdout/stderr logs from all running containers',
    description:
      'Stream structured and unstructured container logs into Elastic for search, alerting, and correlation with metrics.',
  },
  {
    id: 'k8s_nodes',
    name: 'Kubernetes Nodes',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Infrastructure',
    useCase: 'Track CPU, memory, disk & network utilization per node',
    description:
      'Detect overloaded nodes, disk pressure, and memory saturation before the scheduler starts evicting pods.',
  },
  {
    id: 'k8s_cluster_state',
    name: 'Kubernetes Cluster State',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Infrastructure',
    useCase: 'Observe cluster-wide resource quotas, limits & capacity',
    description:
      'Get a global view of allocatable resources vs. requested across all namespaces to plan capacity proactively.',
  },
  {
    id: 'k8s_namespaces',
    name: 'Kubernetes Namespaces',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Infrastructure',
    useCase: 'View resource distribution & quota usage across namespaces',
    description:
      'Spot namespaces approaching quota limits and identify which teams are driving the most resource consumption.',
  },
  {
    id: 'k8s_persistent_volumes',
    name: 'Persistent Volumes',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Infrastructure',
    useCase: 'Track PV capacity, usage & binding status',
    description:
      'Alert on volumes nearing full capacity and catch unbound or failed PVs before applications lose their storage.',
  },
  {
    id: 'k8s_events',
    name: 'Kubernetes Events',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Infrastructure',
    useCase: 'Stream cluster events for debugging & change detection',
    description:
      'Surface pod scheduling failures, image pull errors, and node taint changes through a searchable event stream.',
  },
  {
    id: 'k8s_api_server',
    name: 'Kubernetes API Server',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Performance',
    useCase: 'Monitor request latency, error rates & API availability',
    description:
      'Detect slow API responses, high request error rates, and etcd latency spikes that degrade the entire control plane.',
  },
  {
    id: 'k8s_scheduler',
    name: 'Kubernetes Scheduler',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Performance',
    useCase: 'Track scheduling failures, queue depth & binding latency',
    description:
      'Identify pods stuck in Pending state and diagnose whether the cause is resource pressure or affinity constraints.',
  },
  {
    id: 'k8s_controller_manager',
    name: 'Controller Manager',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Performance',
    useCase: 'Detect reconciliation errors & work queue saturation',
    description:
      'Monitor controller loop health to catch runaway reconciliation, work queue buildup, and leader election failures.',
  },
  {
    id: 'k8s_ingress',
    name: 'Kubernetes Ingress',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Networking',
    useCase: 'Analyze HTTP traffic routing, errors & request latency',
    description:
      'Correlate ingress request rates, error responses, and latency spikes with upstream service health.',
  },
  {
    id: 'k8s_services',
    name: 'Kubernetes Services',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Networking',
    useCase: 'Monitor service endpoint health & connection distribution',
    description:
      'Detect unhealthy endpoints removed from service load balancing and track connection patterns across pods.',
  },
  {
    id: 'k8s_network_policies',
    name: 'Network Policies',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Networking',
    useCase: 'Audit allowed & blocked traffic between workloads',
    description:
      'Verify that network policy rules are correctly isolating workloads and identify unexpected cross-namespace traffic.',
  },
  {
    id: 'k8s_audit_logs',
    name: 'Kubernetes Audit Logs',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Security',
    useCase: 'Audit every API call, role binding & access change',
    description:
      'Build a complete audit trail for compliance, detect unauthorized resource access, and investigate privilege escalation.',
  },
  {
    id: 'k8s_pod_security',
    name: 'Pod Security',
    logoUrl: `${K8S}/logo_kubernetes.svg`,
    category: 'Security',
    useCase: 'Detect privilege escalation & policy violations',
    description:
      'Alert on privileged containers, host path mounts, and workloads violating Pod Security Standards in your cluster.',
    badge: 'Technical preview',
  },
];
