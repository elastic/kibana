/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVERY_STATS_MESSAGE = ({
  newConnectorResultsCount,
  newDiscoveriesCount,
}: {
  newConnectorResultsCount: number;
  newDiscoveriesCount: number;
}) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.pages.pageTitle.statusConnectors', {
    values: { newConnectorResultsCount, newDiscoveriesCount },
    defaultMessage:
      'You have {newDiscoveriesCount} new {newDiscoveriesCount, plural, =1 {discovery} other {discoveries}} across {newConnectorResultsCount} {newConnectorResultsCount, plural, =1 {connector} other {connectors}} to view.',
  });
