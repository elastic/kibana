/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const TREE_NAV_CLUSTER = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.cluster', {
    defaultMessage: '{isPlural, select, true {clusters} other {cluster}}',
    values: { isPlural },
  });
const TREE_NAV_NAMESPACE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.namespace', {
    defaultMessage: '{isPlural, select, true {namespaces} other {namespace}}',
    values: { isPlural },
  });
const TREE_NAV_POD = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.pod', {
    defaultMessage: '{isPlural, select, true {pods} other {pod}}',
    values: { isPlural },
  });
const TREE_NAV_CONTAINER_IMAGE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.containerImage', {
    defaultMessage: '{isPlural, select, true {container images} other { container image}}',
    values: { isPlural },
  });
const TREE_NAV_NODE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.node', {
    defaultMessage: '{isPlural, select, true {nodes} other {node}}',
    values: { isPlural },
  });

export const translations = {
  cluster: TREE_NAV_CLUSTER,
  namespace: TREE_NAV_NAMESPACE,
  pod: TREE_NAV_POD,
  containerImage: TREE_NAV_CONTAINER_IMAGE,
  node: TREE_NAV_NODE,
};
