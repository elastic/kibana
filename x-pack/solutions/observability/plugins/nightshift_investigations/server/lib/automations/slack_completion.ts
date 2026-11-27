/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from './generate_workflow_yaml';

interface SlackCompletion {
  action?: string | null;
  targetMode?: string | null;
  connectorId?: string | null;
}

export const isElasticAppConnector = (connectorId?: string | null): boolean =>
  (connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID) === ELASTIC_APPS_SLACK_CONNECTOR_ID;

export const isElasticAppSlackChannelCompletion = ({
  action,
  targetMode,
  connectorId,
}: SlackCompletion): boolean =>
  action === 'post_to_slack' && targetMode === 'channel' && isElasticAppConnector(connectorId);
