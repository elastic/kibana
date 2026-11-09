/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CLUSTER_COLUMN_ID, NAME_COLUMN_ID, NAMESPACE_COLUMN_ID } from './entity_type_config';

/**
 * Display labels of the output columns, keyed by column name.
 *
 * TODO: Remove an entry once the `columns` of the response carry a display name for it. The
 * definition thread has not settled where that name comes from, and until it does the table
 * would show raw names such as `available_replicas`:
 * https://github.com/elastic/kibana/pull/303101#discussion_r4477715741
 */
export const COLUMN_LABELS: Readonly<Record<string, string>> = {
  [NAME_COLUMN_ID]: i18n.translate('xpack.entityInventoryApp.entityTable.columns.name', {
    defaultMessage: 'Name',
  }),
  'entity.id': i18n.translate('xpack.entityInventoryApp.entityTable.columns.entityId', {
    defaultMessage: 'Entity ID',
  }),
  'host.id': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostId', {
    defaultMessage: 'Host ID',
  }),
  'host.name': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostName', {
    defaultMessage: 'Host name',
  }),
  'host.hostname': i18n.translate('xpack.entityInventoryApp.entityTable.columns.hostname', {
    defaultMessage: 'Hostname',
  }),
  'os.type': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osType', {
    defaultMessage: 'OS type',
  }),
  'os.name': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osName', {
    defaultMessage: 'OS name',
  }),
  'os.version': i18n.translate('xpack.entityInventoryApp.entityTable.columns.osVersion', {
    defaultMessage: 'OS version',
  }),
  'host.os.kernel': i18n.translate('xpack.entityInventoryApp.entityTable.columns.kernel', {
    defaultMessage: 'Kernel',
  }),
  'host.arch': i18n.translate('xpack.entityInventoryApp.entityTable.columns.architecture', {
    defaultMessage: 'Architecture',
  }),
  'host.ip': i18n.translate('xpack.entityInventoryApp.entityTable.columns.ipAddresses', {
    defaultMessage: 'IP addresses',
  }),
  'k8s.cluster.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.kubernetesCluster',
    { defaultMessage: 'Kubernetes cluster' }
  ),
  'cloud.provider': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudProvider', {
    defaultMessage: 'Cloud provider',
  }),
  'cloud.platform': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudPlatform', {
    defaultMessage: 'Cloud platform',
  }),
  'cloud.region': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudRegion', {
    defaultMessage: 'Cloud region',
  }),
  'cloud.availability_zone': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.availabilityZone',
    { defaultMessage: 'Availability zone' }
  ),
  'cloud.account.id': i18n.translate('xpack.entityInventoryApp.entityTable.columns.cloudAccount', {
    defaultMessage: 'Cloud account',
  }),
  [NAMESPACE_COLUMN_ID]: i18n.translate('xpack.entityInventoryApp.entityTable.columns.namespace', {
    defaultMessage: 'Namespace',
  }),
  'k8s.namespace.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.namespaceOtel',
    { defaultMessage: 'Namespace (OpenTelemetry)' }
  ),
  'kubernetes.namespace': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.namespaceElasticAgent',
    { defaultMessage: 'Namespace (Elastic Agent)' }
  ),
  'k8s.deployment.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.deploymentOtel',
    { defaultMessage: 'Deployment (OpenTelemetry)' }
  ),
  'kubernetes.deployment.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.deploymentElasticAgent',
    { defaultMessage: 'Deployment (Elastic Agent)' }
  ),
  'orchestrator.cluster.name': i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.clusterElasticAgent',
    { defaultMessage: 'Cluster (Elastic Agent)' }
  ),
  available_replicas: i18n.translate(
    'xpack.entityInventoryApp.entityTable.columns.availableReplicas',
    { defaultMessage: 'Available replicas' }
  ),
  desired_replicas: i18n.translate('xpack.entityInventoryApp.entityTable.columns.desiredReplicas', {
    defaultMessage: 'Desired replicas',
  }),
  app: i18n.translate('xpack.entityInventoryApp.entityTable.columns.app', {
    defaultMessage: 'App',
  }),
  resource_id: i18n.translate('xpack.entityInventoryApp.entityTable.columns.resourceId', {
    defaultMessage: 'Resource ID',
  }),
  [CLUSTER_COLUMN_ID]: i18n.translate('xpack.entityInventoryApp.entityTable.columns.cluster', {
    defaultMessage: 'Cluster',
  }),
  paused: i18n.translate('xpack.entityInventoryApp.entityTable.columns.paused', {
    defaultMessage: 'Paused',
  }),
  last_seen: i18n.translate('xpack.entityInventoryApp.entityTable.columns.lastSeen', {
    defaultMessage: 'Last seen',
  }),
};

/** The label of a column, or its raw name when the app has no label for it. */
export const getColumnLabel = (columnName: string): string =>
  COLUMN_LABELS[columnName] ?? columnName;
