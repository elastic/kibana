/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ServiceNowITSMConnectorTypeId as ServiceNowConnectorTypeId,
  TeamsConnectorTypeId,
} from '@kbn/stack-connectors-plugin/server/connector_types';
import type {
  EmailConnectorTypeId,
  EsIndexConnectorTypeId,
  JiraConnectorTypeId,
  PagerDutyConnectorTypeId,
  ServerLogConnectorTypeId,
  SlackApiConnectorTypeId,
  SlackWebhookConnectorTypeId,
  WebhookConnectorTypeId,
} from '@kbn/connector-schemas';

import type { SlackApiConfig } from '@kbn/connector-schemas/slack_api';

import type { ActionConnector as RawActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

export type ActionTypeId =
  | typeof SlackWebhookConnectorTypeId
  | typeof SlackApiConnectorTypeId
  | typeof PagerDutyConnectorTypeId
  | typeof ServerLogConnectorTypeId
  | typeof EsIndexConnectorTypeId
  | typeof TeamsConnectorTypeId
  | typeof ServiceNowConnectorTypeId
  | typeof JiraConnectorTypeId
  | typeof WebhookConnectorTypeId
  | typeof EmailConnectorTypeId;

export type ActionConnector = Omit<RawActionConnector, 'secrets'> & {
  config?: SlackApiConfig;
};
