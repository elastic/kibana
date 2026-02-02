/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EmailConnectorTypeId,
  EsIndexConnectorTypeId,
  JiraConnectorTypeId,
  OpsgenieConnectorTypeId,
  PagerDutyConnectorTypeId,
  ServerLogConnectorTypeId,
  ServiceNowITSMConnectorTypeId as ServiceNowConnectorTypeId,
  SlackApiConnectorTypeId,
  SlackWebhookConnectorTypeId,
  TeamsConnectorTypeId,
  WebhookConnectorTypeId,
} from '@kbn/connector-schemas';

import type { ActionConnector as RawActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { SlackApiConfig } from '@kbn/connector-schemas/slack_api';

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
  | typeof EmailConnectorTypeId
  | typeof OpsgenieConnectorTypeId;

export type ActionConnector = Omit<RawActionConnector, 'secrets'> & { config?: SlackApiConfig };
