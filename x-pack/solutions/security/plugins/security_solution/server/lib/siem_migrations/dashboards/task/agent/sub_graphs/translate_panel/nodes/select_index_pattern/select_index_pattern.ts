/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { ChatModel } from '../../../../../../../common/task/util/actions_client_chat';
import type { DashboardMigrationTelemetryClient } from '../../../../../dashboard_migrations_telemetry_client';
import type { GraphNode } from '../../types';

interface GetSelectIndexPatternParams {
  model: ChatModel;
  telemetryClient: DashboardMigrationTelemetryClient;
  logger: Logger;
}

export const getSelectIndexPatternNode = (params: GetSelectIndexPatternParams): GraphNode => {
  return async (_state) => {
    // TODO: implement index pattern discovery
    return {
      index_pattern: '[index_pattern]',
    };
  };
};
