/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECTED_DISCOVERIES = (attackDiscoveriesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.summary.selectedActions.selectedDiscoveriesLabel',
    {
      defaultMessage: `Selected {attackDiscoveriesCount} {attackDiscoveriesCount, plural, =1 {Attack discovery} other {Attack discoveries}}`,
      values: { attackDiscoveriesCount },
    }
  );
