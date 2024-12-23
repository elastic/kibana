/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeFormatter } from '@kbn/observability-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type {
  AssetDetailsLocatorParams,
  InventoryLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { getInventoryViewInAppUrl } from '../../../common/alerting/metrics/alert_link';

export const getRuleFormat = ({
  assetDetailsLocator,
  inventoryLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  inventoryLocator?: LocatorPublic<InventoryLocatorParams>;
}): ObservabilityRuleTypeFormatter => {
  return ({ fields }) => {
    const reason = fields[ALERT_REASON] ?? '-';

    return {
      reason,
      link: getInventoryViewInAppUrl({ fields, assetDetailsLocator, inventoryLocator }),
      hasBasePath: true,
    };
  };
};
