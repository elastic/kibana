/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';

import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { Dataset, Integration } from '../../../common/datasets';
import {
  DATASETS_URL,
  FindDatasetsRequestQuery,
  findDatasetsRequestQueryRT,
  findDatasetsResponseRT,
  FindDatasetValue,
  FindIntegrationsRequestQuery,
  findIntegrationsRequestQueryRT,
  findIntegrationsResponseRT,
  FindIntegrationsValue,
  INTEGRATIONS_URL,
} from '../../../common/latest';
import { FindDatasetsError, FindIntegrationsError } from '../../../common/datasets/errors';
import { IDatasetsClient } from './types';

const defaultIntegrationsParams: Pick<FindIntegrationsRequestQuery, 'dataStreamType'> = {
  dataStreamType: 'logs',
};

const defaultDatasetsParams: Pick<FindDatasetsRequestQuery, 'type' | 'uncategorisedOnly'> = {
  type: 'logs',
  uncategorisedOnly: true,
};

export class DatasetsClient implements IDatasetsClient {
  constructor(private readonly http: HttpStart) {}

  public async findIntegrations(
    params: FindIntegrationsRequestQuery = {}
  ): Promise<FindIntegrationsValue> {
    const search = { ...defaultIntegrationsParams, ...params };

    const query = findIntegrationsRequestQueryRT.encode(search);

    const response = await this.http
      .get(INTEGRATIONS_URL, { query, version: API_VERSIONS.public.v1 })
      .catch((error) => {
        throw new FindIntegrationsError(`Failed to fetch integrations": ${error}`);
      });

    const data = decodeOrThrow(
      findIntegrationsResponseRT,
      (message: string) =>
        new FindIntegrationsError(`Failed to decode integrations response: ${message}"`)
    )(response);

    return { ...data, items: data.items.map(Integration.create) };
  }

  public async findDatasets(params: FindDatasetsRequestQuery = {}): Promise<FindDatasetValue> {
    const search = { ...defaultDatasetsParams, ...params };

    const query = findDatasetsRequestQueryRT.encode(search);

    const response = await this.http
      .get(DATASETS_URL, { query, version: API_VERSIONS.public.v1 })
      .catch((error) => {
        throw new FindDatasetsError(`Failed to fetch data streams": ${error}`);
      });

    const data = decodeOrThrow(
      findDatasetsResponseRT,
      (message: string) =>
        new FindDatasetsError(`Failed to decode data streams response: ${message}"`)
    )(response);

    return { items: data.items.map((dataset) => Dataset.create(dataset)) };
  }
}
