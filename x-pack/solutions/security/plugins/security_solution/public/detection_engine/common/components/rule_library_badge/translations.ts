/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ELASTIC_LIBRARY_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.ruleLibraryBadge.elasticLabel',
  {
    defaultMessage: 'Elastic',
  }
);

export const COMMUNITY_LIBRARY_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.ruleLibraryBadge.communityLabel',
  {
    defaultMessage: 'Community',
  }
);

export const RULE_LIBRARY_TOOLTIP = (title: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.ruleLibraryBadge.tooltip', {
    defaultMessage: 'From {title}',
    values: { title },
  });
