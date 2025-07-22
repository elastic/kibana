/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import {
  getActionTypeTitle,
  getGenAiConfig,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import type { StartServices } from '../../../types';
import * as i18n from './translations';

export const getConnectorDescription = ({
  connector,
  actionTypeRegistry,
}: {
  connector: AIConnector;
  actionTypeRegistry: StartServices['triggersActionsUi']['actionTypeRegistry'];
}): string => {
  if (connector.isPreconfigured) {
    return i18n.PRECONFIGURED_CONNECTOR;
  } else {
    return (
      getGenAiConfig(connector)?.apiProvider ??
      getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId))
    );
  }
};
