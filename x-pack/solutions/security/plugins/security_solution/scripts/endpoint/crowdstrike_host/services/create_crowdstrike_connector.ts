/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { CROWDSTRIKE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import { dump } from '../../common/utils';
import { fetchActiveSpace } from '../../common/spaces';
import { createConnector, fetchConnectorByType } from '../../common/connectors_services';

interface CreateCrowdStrikeConnectorIfNeededOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  name?: string;
}

export const createCrowdStrikeConnectorIfNeeded = async ({
  kbnClient,
  log,
  clientId,
  clientSecret,
  apiUrl,
  name: _name,
}: CreateCrowdStrikeConnectorIfNeededOptions): Promise<void> => {
  const existingConnector = await fetchConnectorByType(kbnClient, CROWDSTRIKE_CONNECTOR_ID);

  if (existingConnector) {
    log.debug(`Nothing to do. A connector for CrowdStrike is already configured`);
    log.verbose(dump(existingConnector));
    return;
  }

  const name =
    _name ?? `CrowdStrike Dev instance (space: ${(await fetchActiveSpace(kbnClient)).id})`;

  log.info(`Creating CrowdStrike Connector with name: ${name}`);

  const newConnector = await createConnector(kbnClient, {
    name,
    connector_type_id: CROWDSTRIKE_CONNECTOR_ID,
    config: {
      url: apiUrl,
    },
    secrets: {
      clientId,
      clientSecret,
    },
  });

  log.verbose(dump(newConnector));
};
