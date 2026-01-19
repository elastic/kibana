/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'langchain/document';
import type { Logger } from '@kbn/core/server';
import type { Metadata } from '@kbn/elastic-assistant-common';
import { globSync } from 'fs';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { resolve } from 'path';
import pMap from 'p-map';
import normalizePath from 'normalize-path';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE } from '../../../routes/knowledge_base/constants';
import { appContextService } from '../../../services/app_context';
import { DEFAULT_PLUGIN_NAME } from '../../../routes/helpers';
import { addRequiredKbResourceMetadata } from './add_required_kb_resource_metadata';

/**
 * Loads Defend Insights knowledge base files organized by insight type
 */
export const loadDefendInsights = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger
): Promise<boolean> => {
  const isPolicyResponseFailureEnabled =
    appContextService.getRegisteredFeatures(
      DEFAULT_PLUGIN_NAME
    ).defendInsightsPolicyResponseFailure;

  if (!isPolicyResponseFailureEnabled) {
    return true;
  }

  try {
    const subdirectories = [
      {
        path: 'policy_response_failure',
        resource: DEFEND_INSIGHTS_POLICY_RESPONSE_FAILURE,
      },
    ];

    let totalDocsLoaded = 0;

    for (const { path: subPath, resource } of subdirectories) {
      const docsLoader = new DirectoryLoader(
        resolve(__dirname, `../../../knowledge_base/defend_insights/${subPath}`),
        {
          '.md': (path) => new TextLoader(path),
        },
        true
      );

      const rawDocs = await docsLoader.load();

      if (rawDocs.length > 0) {
        // Add metadata specific to this resource type
        const docs = addRequiredKbResourceMetadata({
          docs: rawDocs,
          kbResource: resource,
          required: true, // Mark as required for defend insights
        }) as Array<Document<Metadata>>;

        logger.info(
          `Loading ${docs.length} Defend Insights docs from ${subPath} into the Knowledge Base`
        );

        // Ingest documents one by one to avoid blocking Inference Endpoint
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

        const loadedCount = response?.length ?? 0;
        totalDocsLoaded += loadedCount;
        logger.info(`Loaded ${loadedCount} Defend Insights docs from ${subPath}`);
      } else {
        logger.info(`No documents found in defend_insights/${subPath}`);
      }
    }

    logger.info(`Total Defend Insights docs loaded: ${totalDocsLoaded}`);
    return totalDocsLoaded > 0;
  } catch (e) {
    logger.error(`Failed to load Defend Insights docs into the Knowledge Base\n${e}`);
    return false;
  }
};

export const getDefendInsightsDocsCount = async ({
  logger,
}: {
  logger: Logger;
}): Promise<number> => {
  try {
    const files = globSync('**/*.{md,txt}', {
      cwd: resolve(__dirname, '../../../knowledge_base/defend_insights'),
    }).map((p) => normalizePath(p));

    return files.length;
  } catch (e) {
    logger.error(`Failed to get Defend Insights source docs count\n${e}`);
    return 0;
  }
};
