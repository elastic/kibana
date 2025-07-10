/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import { dump } from '../../common/utils';
import { fetchActiveSpace } from '../../common/spaces';
import { createConnector, fetchConnectorByType } from '../../common/connectors_services';

interface CreateMicrosoftDefenderForEndpointConnectorIfNeededOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  clientId: string;
  tenantId: string;
  oAuthServerUrl: string;
  oAuthScope: string;
  apiUrl: string;
  clientSecret: string;
  name?: string;
}

export const createMicrosoftDefenderForEndpointConnectorIfNeeded = async ({
  kbnClient,
  log,
  clientId,
  tenantId,
  oAuthServerUrl,
  oAuthScope,
  apiUrl,
  clientSecret,
  name: _name,
}: CreateMicrosoftDefenderForEndpointConnectorIfNeededOptions): Promise<void> => {
  const existingConnector = await fetchConnectorByType(
    kbnClient,
    MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID
  );

  if (existingConnector) {
    log.debug(`Nothing to do. A connector for SentinelOne is already configured`);
    log.verbose(dump(existingConnector));
    return;
  }

  const name =
    _name ?? `Microsoft Defender Dev instance (space: ${(await fetchActiveSpace(kbnClient)).id})`;

  log.info(`Creating Microsoft Defender Connector with name: ${name}`);

  const newConnector = await createConnector(kbnClient, {
    name,
    connector_type_id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
    config: { clientId, tenantId, oAuthServerUrl, oAuthScope, apiUrl },
    secrets: { clientSecret },
  });

  log.verbose(dump(newConnector));
};
