/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globSync } from 'fs';
import normalizePath from 'normalize-path';
import type { Logger } from '@kbn/core/server';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { resolve } from 'path';
import type { Document } from 'langchain/document';
import type { Metadata } from '@kbn/elastic-assistant-common';
import pMap from 'p-map';
import { ENCODED_FILE_MICROMATCH_PATTERN } from '@kbn/ai-security-labs-content';
import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { SECURITY_LABS_RESOURCE } from '../../../routes/knowledge_base/constants';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { EncodedSecurityLabsContentLoader } from './encoded_security_labs_content_loader';

/**
 * Loads the Elastic Security Labs mdx files into the Knowledge Base.
 */
export const loadSecurityLabs = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const docsLoader = new DirectoryLoader(
      resolve(__dirname, '../../../knowledge_base/security_labs'),
      {
        '.md': (path) => new EncodedSecurityLabsContentLoader(path),
      },
      true
    );

    const rawDocs = await docsLoader.load();

    // Add additional metadata to set kbResource as esql
    const docs = addRequiredKbResourceMetadata({
      docs: rawDocs,
      kbResource: SECURITY_LABS_RESOURCE,
      required: false,
    }) as Array<Document<Metadata>>;

    logger.info(`Loading ${docs.length} Security Labs docs into the Knowledge Base`);

    /**
     * Ingest Security Labs docs into the Knowledge Base one by one to avoid blocking
     * Inference Endpoint for too long
     */

    const response = (
      await pMap(
        docs,
        (singleDoc) =>
          kbDataClient.addKnowledgeBaseDocuments({
            documents: [singleDoc],
            global: true,
          }),
        { concurrency: 1 }
      )
    ).flat();

    logger.info(`Loaded ${response?.length ?? 0} Security Labs docs into the Knowledge Base`);

    return response.length > 0;
  } catch (e) {
    logger.error(`Failed to load Security Labs docs into the Knowledge Base\n${e}`);
    return false;
  }
};

export const getSecurityLabsDocsCount = async ({ logger }: { logger: Logger }): Promise<number> => {
  try {
    const files = globSync(ENCODED_FILE_MICROMATCH_PATTERN, {
      cwd: resolve(__dirname, '../../../knowledge_base/security_labs'),
    }).map((p) => normalizePath(p));

    return files.length;
  } catch (e) {
    logger.error(`Failed to get Security Labs source docs count\n${e}`);
    return 0;
  }
};
