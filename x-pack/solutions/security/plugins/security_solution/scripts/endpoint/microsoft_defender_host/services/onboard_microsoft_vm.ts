/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { IndexResponse } from '@elastic/elasticsearch/lib/api/types';
import { MicrosoftDefenderDataGenerator } from '../../../../common/endpoint/data_generators/microsoft_defender_data_generator';
import { MICROSOFT_DEFENDER_INTEGRATION_PACKAGE_NAME } from './constants';
import { installIntegration } from '../../common/fleet_services';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

export interface OnboardVmHostWithMicrosoftDefenderOptions {
  kbnClient: KbnClient;
  log?: ToolingLog;
  vmName?: string;
  forceNewHost?: boolean;
}

export const onboardVmHostWithMicrosoftDefender = async ({
  kbnClient,
  log = createToolingLogger(),
}: OnboardVmHostWithMicrosoftDefenderOptions) => {
  // FIXME:PT implement creation of new VM and connect it to MS Defender managment system
  // --------------------------------------------
  //  Steps needed:
  //
  //  1. create VM with at least 4gb of memory
  //  2. Call MS API and get a device onboarding script download URL
  //  3. Download onboarding script to VM
  //  4. Download GIT hub script for running enrollment
  //  5. Run onboarding
  //  6. Ensure real_time_protections is enabled on VM
  //  7. Run tests to generate an alert
  //
  // --------------------------------------------

  log?.warning(`
  Creation of a VM host running Microsoft Defender for Endpoint is not yet implemented. However, an event
  will be indexed that will enable testing within Kibana only.
  `);

  await installIntegration(kbnClient, MICROSOFT_DEFENDER_INTEGRATION_PACKAGE_NAME);

  const indexName = 'logs-microsoft_defender_endpoint.log-default';
  const docToCreate = new MicrosoftDefenderDataGenerator().generateEndpointLog();

  log.verbose(`Creating event in [${indexName}]:\n ${JSON.stringify(docToCreate, null, 2)}`);

  const indexedDoc = await kbnClient
    .request<IndexResponse>({
      method: 'POST',
      path: 'api/console/proxy',
      headers: { 'elastic-api-version': '2023-10-31' },
      query: {
        path: `${indexName}/_doc`,
        method: 'POST',
      },
      body: docToCreate,
    })
    .then((response) => response.data);

  log.verbose(`event create response:\n ${JSON.stringify(indexedDoc, null, 2)}`);
  log.info(`A host log event with id [${indexedDoc._id}] has been indexed in [${indexName}]`);
};
