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
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';
import { SECURITY_LABS_RESOURCE } from '../../../routes/knowledge_base/constants';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { EncodedSecurityLabsContentLoader } from './encoded_security_labs_content_loader';

/**
 * Checks if Security Labs content is installed via the CDN.
 * Returns true if installed, false otherwise.
 */
export const isSecurityLabsInstalledViaCDN = async (
  productDocBase: ProductDocBaseStartContract | undefined,
  logger: Logger
): Promise<boolean> => {
  if (!productDocBase) {
    return false;
  }

  try {
    const status = await productDocBase.management.getSecurityLabsStatus({
      inferenceId: '.elser-2-elasticsearch',
    });
    return status.status === 'installed';
  } catch (e) {
    logger.debug(`Could not check Security Labs CDN status: ${e.message}`);
    return false;
  }
};

/**
 * Loads the Elastic Security Labs mdx files into the Knowledge Base.
 * If Security Labs is already installed via CDN, this function will skip loading bundled content.
 *
 * @param kbDataClient - Knowledge base data client
 * @param logger - Logger instance
 * @param productDocBase - Optional product doc base plugin start contract for CDN check
 */
export const loadSecurityLabs = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger,
  productDocBase?: ProductDocBaseStartContract
): Promise<boolean> => {
  try {
    // Check if Security Labs is already installed via CDN
    const isInstalledViaCDN = await isSecurityLabsInstalledViaCDN(productDocBase, logger);
    if (isInstalledViaCDN) {
      logger.info(
        'Security Labs content is already installed via CDN. Skipping bundled content loading.'
      );
      return true;
    }

    logger.info('Security Labs not installed via CDN. Loading bundled content...');

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
