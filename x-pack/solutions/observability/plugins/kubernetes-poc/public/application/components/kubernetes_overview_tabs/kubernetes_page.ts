/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enum representing the different pages/tabs in the Kubernetes POC plugin.
 */
export enum KubernetesPage {
  Overview = 'overview',
  Clusters = 'clusters',
  Nodes = 'nodes',
  Namespaces = 'namespaces',
  DaemonSets = 'daemonsets',
  Services = 'services',
  Deployments = 'deployments',
  Containers = 'containers',
  Pods = 'pods',
}
