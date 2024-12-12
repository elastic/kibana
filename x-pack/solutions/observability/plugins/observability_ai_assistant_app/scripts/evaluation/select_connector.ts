/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import { ToolingLog } from '@kbn/tooling-log';
import { KibanaClient } from './kibana_client';

export async function selectConnector({
  connectors,
  preferredId,
  log,
  message = 'Select a connector',
}: {
  connectors: Awaited<ReturnType<KibanaClient['getConnectors']>>;
  preferredId?: string;
  log: ToolingLog;
  message?: string;
}) {
  let connector = connectors.find((item) => item.id === preferredId);

  if (!connector && preferredId) {
    log.warning(`Could not find connector ${preferredId}`);
  }

  if (!connector && connectors.length === 1) {
    connector = connectors[0];
    log.debug('Using the only connector found');
  } else if (!connector) {
    const connectorChoice = await inquirer.prompt({
      type: 'list',
      name: 'connector',
      message,
      choices: connectors.map((item) => ({ name: `${item.name} (${item.id})`, value: item.id })),
    });

    connector = connectors.find((item) => item.id === connectorChoice.connector)!;
  }

  return connector;
}
