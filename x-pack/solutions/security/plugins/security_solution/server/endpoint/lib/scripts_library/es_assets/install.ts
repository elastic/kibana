/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ScriptsFileDataIndexTemplate, ScriptsFileMetadataIndexTemplate } from './index_template';
import { SCRIPTS_LIBRARY_FILE_DATA_INDEX_NAME } from '../constants';
import { catchAndWrapError } from '../../../utils';

interface InstallScriptsLibraryIndexTemplatesOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const installScriptsLibraryIndexTemplates = async ({
  esClient,
  logger,
}: InstallScriptsLibraryIndexTemplatesOptions): Promise<void> => {
  logger.debug('Installing/updating scripts library ES index templates');

  await esClient.indices
    .putIndexTemplate(ScriptsFileMetadataIndexTemplate)
    .catch(catchAndWrapError);

  await esClient.indices.putIndexTemplate(ScriptsFileDataIndexTemplate).catch(catchAndWrapError);

  // ensure template mappings are used by precreating data index
  await esClient.indices
    .create({ index: SCRIPTS_LIBRARY_FILE_DATA_INDEX_NAME })
    .catch(catchAndWrapError);
};
