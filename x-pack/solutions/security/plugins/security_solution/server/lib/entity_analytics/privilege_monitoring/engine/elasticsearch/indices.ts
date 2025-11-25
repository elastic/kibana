/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOrUpdateIndex } from '../../../utils/create_or_update_index';
import type { PrivilegeMonitoringDataClient } from '../data_client';
import { generateUserIndexMappings } from './mappings';
import { PRIVMON_EVENT_INGEST_PIPELINE_ID, eventIngestPipeline } from './pipeline';

export type PrivmonIndexService = ReturnType<typeof createPrivmonIndexService>;
export const createPrivmonIndexService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps, index } = dataClient;
  const internalUserClient = deps.clusterClient.asInternalUser;

  const _upsertIndex = async () => {
    dataClient.log('debug', `Creating or updating index: ${index}`);
    await createOrUpdateIndex({
      esClient: internalUserClient,
      logger: deps.logger,
      options: {
        index,
        mappings: generateUserIndexMappings(),
        settings: {
          hidden: true,
          mode: 'lookup',
          default_pipeline: PRIVMON_EVENT_INGEST_PIPELINE_ID,
        },
      },
    }).catch((e) => {
      if (e.meta.body.error.type === 'resource_already_exists_exception') {
        dataClient.log(
          'debug',
          'Caught error: Privilege monitoring index already exists. Continuing workflow'
        );
        return;
      }
      throw e;
    });
  };

  const doesIndexExist = async () => {
    return internalUserClient.indices
      .exists({
        index,
      })
      .catch((e) => {
        dataClient.log('debug', `Error checking if index exists: ${e.message}`);
        return false;
      });
  };

  const _createIngestPipelineIfDoesNotExist = async () => {
    const pipelinesResponse = await internalUserClient.ingest.getPipeline(
      { id: PRIVMON_EVENT_INGEST_PIPELINE_ID },
      { ignore: [404] }
    );
    if (pipelinesResponse[PRIVMON_EVENT_INGEST_PIPELINE_ID]) {
      dataClient.log('info', 'Privileged user monitoring ingest pipeline already exists.');
      return;
    }
    dataClient.log('info', 'Privileged user monitoring ingest pipeline does not exist, creating.');
    await internalUserClient.ingest.putPipeline(eventIngestPipeline);
  };

  const initialisePrivmonIndex = async () => {
    await _upsertIndex();
    await _createIngestPipelineIfDoesNotExist();
  };

  return {
    _upsertIndex,
    _createIngestPipelineIfDoesNotExist,
    initialisePrivmonIndex,
    doesIndexExist,
  };
};
