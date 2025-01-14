/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import {
  IndexConnectorTypeId,
  SlackWebhookConnectorTypeId,
  EmailConnectorTypeId,
} from '@kbn/stack-connectors-plugin/server/connector_types';
import { EnabledActionTypes } from '@kbn/actions-plugin/server/config';
import type { ProductFeatureKeys } from '@kbn/security-solution-features';

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

const INTERNAL_RULE_ACTIONS = [
  IndexConnectorTypeId,
  SlackWebhookConnectorTypeId,
  EmailConnectorTypeId,
];

/**
 * enable rule actions based on ProductFeature Config
 */
export const enableRuleActions = ({
  actions,
  productFeatureKeys,
}: {
  actions: ActionsPluginSetupContract;
  productFeatureKeys: ProductFeatureKeys;
}) => {
  if (productFeatureKeys.includes(ProductFeatureSecurityKey.externalRuleActions)) {
    // enables all rule actions
    actions.setEnabledConnectorTypes([EnabledActionTypes.Any]);
  } else {
    actions.setEnabledConnectorTypes(INTERNAL_RULE_ACTIONS);
  }
};
