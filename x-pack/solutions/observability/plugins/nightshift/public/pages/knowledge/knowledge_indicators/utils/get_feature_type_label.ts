/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import {
  DATASET_ANALYSIS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
} from '@kbn/significant-events-schema';

const FEATURE_TYPE_LABELS: Readonly<Record<string, string>> = {
  entity: i18n.translate('xpack.nightshift.knowledge.featureType.entity', {
    defaultMessage: 'Entity',
  }),
  infrastructure: i18n.translate('xpack.nightshift.knowledge.featureType.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  technology: i18n.translate('xpack.nightshift.knowledge.featureType.technology', {
    defaultMessage: 'Technology',
  }),
  dependency: i18n.translate('xpack.nightshift.knowledge.featureType.dependency', {
    defaultMessage: 'Dependency',
  }),
  schema: i18n.translate('xpack.nightshift.knowledge.featureType.schema', {
    defaultMessage: 'Schema',
  }),
  [DATASET_ANALYSIS_FEATURE_TYPE]: i18n.translate(
    'xpack.nightshift.knowledge.featureType.datasetAnalysis',
    { defaultMessage: 'Dataset analysis' }
  ),
  [LOG_SAMPLES_FEATURE_TYPE]: i18n.translate('xpack.nightshift.knowledge.featureType.logSamples', {
    defaultMessage: 'Log samples',
  }),
  [LOG_PATTERNS_FEATURE_TYPE]: i18n.translate(
    'xpack.nightshift.knowledge.featureType.logPatterns',
    { defaultMessage: 'Log patterns' }
  ),
  [ERROR_LOGS_FEATURE_TYPE]: i18n.translate('xpack.nightshift.knowledge.featureType.errorLogs', {
    defaultMessage: 'Error logs',
  }),
};

/** Returns the display label for a knowledge indicator feature type. */
export const getFeatureTypeLabel = (type: string): string =>
  FEATURE_TYPE_LABELS[type] ?? upperFirst(type.replace(/_/g, ' '));
