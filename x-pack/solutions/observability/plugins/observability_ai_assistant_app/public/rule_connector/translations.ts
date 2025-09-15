/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_DESC = i18n.translate(
  'xpack.observability.alertConnector.selectMessageText',
  {
    defaultMessage: 'Send messages to Observability AI Assistant.',
  }
);

export const CONNECTOR_TITLE = i18n.translate(
  'xpack.observability.alertConnector.connectorTypeTitle',
  {
    defaultMessage: 'ObsAIAssistant',
  }
);

export const CONNECTOR_REQUIRED = i18n.translate('xpack.observability.requiredConnectorField', {
  defaultMessage: 'Connector is required.',
});

export const MESSAGE_REQUIRED = i18n.translate('xpack.observability.requiredMessageTextField', {
  defaultMessage: 'Message is required.',
});

export const STATUS_REQUIRED = i18n.translate('xpack.observability.requiredStatusField', {
  defaultMessage: 'Status is required.',
});
