/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import { i18n } from '@kbn/i18n';

// TODO confirm if this is needed
const ATTRIBUTE_LABELS: Record<string, string> = {
  'os.type': i18n.translate('xpack.entityInventoryApp.filters.attribute.osType', {
    defaultMessage: 'Operating system',
  }),
  'host.arch': i18n.translate('xpack.entityInventoryApp.filters.attribute.hostArch', {
    defaultMessage: 'Architecture',
  }),
  'cloud.provider': i18n.translate('xpack.entityInventoryApp.filters.attribute.cloudProvider', {
    defaultMessage: 'Cloud provider',
  }),
  'cloud.region': i18n.translate('xpack.entityInventoryApp.filters.attribute.cloudRegion', {
    defaultMessage: 'Cloud region',
  }),
  'k8s.cluster.name': i18n.translate('xpack.entityInventoryApp.filters.attribute.clusterName', {
    defaultMessage: 'Cluster',
  }),
  'k8s.namespace.name': i18n.translate('xpack.entityInventoryApp.filters.attribute.namespace', {
    defaultMessage: 'Namespace',
  }),
  'k8s.pod.phase': i18n.translate('xpack.entityInventoryApp.filters.attribute.podPhase', {
    defaultMessage: 'Phase',
  }),
};

export const CATEGORY_FILTER_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.categoryFilterLabel',
  { defaultMessage: 'Category' }
);

export const TYPE_FILTER_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.typeFilterLabel',
  {
    defaultMessage: 'Type',
  }
);

export const getCategoryLabel = (category: string): string => upperFirst(category);

export const getAttributeLabel = (attribute: string): string =>
  ATTRIBUTE_LABELS[attribute] ?? attribute;
