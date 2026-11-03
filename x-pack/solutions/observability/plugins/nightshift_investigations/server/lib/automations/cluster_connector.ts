/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { omit } from 'lodash';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { EXTERNAL_ELASTICSEARCH_CONNECTOR_TYPE_ID } from '../../../common';
import type { NightshiftTriggerRow } from './types';

type ClusterConnectorActionsClient = Pick<ActionsClient, 'get'>;

/**
 * An alert-mode webhook can name the External Elasticsearch connector for the cluster its alerts
 * come from. The connector is checked and its name looked up here, at save time, and kept on the
 * row for the investigation prompt. Any other webhook, and any other trigger, carries none.
 */
export async function resolveClusterConnector(
  actionsClient: ClusterConnectorActionsClient | undefined,
  rows: NightshiftTriggerRow[]
): Promise<NightshiftTriggerRow[]> {
  return Promise.all(
    rows.map(async (row): Promise<NightshiftTriggerRow> => {
      if (row.kind !== 'webhook') return row;
      const withoutCluster = omit(row, ['clusterConnectorId', 'clusterConnectorName']);
      const { clusterConnectorId } = row;
      if (row.mode !== 'alert' || !clusterConnectorId) return withoutCluster;
      if (!actionsClient) throw serverUnavailable('Actions is not available');

      let connector;
      try {
        connector = await actionsClient.get({ id: clusterConnectorId });
      } catch (err) {
        throw badRequest(`Cluster connector ${clusterConnectorId} not found: ${err.message}`);
      }
      if (connector.actionTypeId !== EXTERNAL_ELASTICSEARCH_CONNECTOR_TYPE_ID) {
        throw badRequest(
          `Cluster connector ${clusterConnectorId} must be an External Elasticsearch connector`
        );
      }
      return { ...withoutCluster, clusterConnectorId, clusterConnectorName: connector.name };
    })
  );
}
