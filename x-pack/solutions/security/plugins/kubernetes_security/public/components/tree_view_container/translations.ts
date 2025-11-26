/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BREADCRUMBS_CLUSTER_TREE_VIEW_LEVELS = {
  clusterId: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.clusterId', {
    defaultMessage: 'Cluster',
  }),
  clusterName: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.clusterName', {
    defaultMessage: 'Cluster',
  }),
  namespace: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.namespace', {
    defaultMessage: 'Namespace',
  }),
  node: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.node', {
    defaultMessage: 'Node',
  }),
  pod: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.pod', {
    defaultMessage: 'Pod',
  }),
  containerImage: i18n.translate('xpack.kubernetesSecurity.treeView.breadcrumb.containerImage', {
    defaultMessage: 'Container Image',
  }),
};
