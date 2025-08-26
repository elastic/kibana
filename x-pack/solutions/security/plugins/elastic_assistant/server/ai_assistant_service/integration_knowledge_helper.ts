/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { IndexEntryType } from '@kbn/elastic-assistant-common';
import type { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import type { EsIndexEntry } from '../ai_assistant_data_clients/knowledge_base/types';

const INTEGRATION_KNOWLEDGE_INDEX_NAME = '.integration_knowledge';

/**
 * Checks if the integration knowledge index entry already exists
 */
export const checkIntegrationKnowledgeIndexEntryExists = async ({
  kbDataClient,
  logger,
}: {
  kbDataClient: AIAssistantKnowledgeBaseDataClient;
  logger: Logger;
}): Promise<boolean> => {
  try {
    const results = await kbDataClient.findDocuments<EsIndexEntry>({
      page: 1,
      perPage: 1,
      filter: `type:index AND index:${INTEGRATION_KNOWLEDGE_INDEX_NAME}`,
    });

    const exists = results.total > 0;
    logger.debug(`Integration knowledge index entry exists: ${exists}`);
    return exists;
  } catch (error) {
    logger.debug(`Error checking integration knowledge index entry: ${error.message}`);
    return false;
  }
};

/**
 * Ensures the integration knowledge index entry exists during Knowledge Base setup.
 * Similar to loadSecurityLabs() but for Index Entries rather than Document Entries.
 */
export const ensureIntegrationKnowledgeIndexEntry = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger,
  telemetry: AnalyticsServiceSetup
): Promise<boolean> => {
  try {
    logger.debug('Checking if integration knowledge index entry exists...');

    const entryExists = await checkIntegrationKnowledgeIndexEntryExists({
      kbDataClient,
      logger,
    });

    if (!entryExists) {
      logger.debug('Creating integration knowledge index entry...');

      const entry = await kbDataClient.createKnowledgeBaseEntry({
        knowledgeBaseEntry: {
          type: IndexEntryType.value,
          index: INTEGRATION_KNOWLEDGE_INDEX_NAME,
          field: 'content',
          name: 'Integration Knowledge',
          description:
            'Integration knowledge base containing semantic information about integrations installed via Fleet. Use this tool to search for information about integrations, integration configurations, troubleshooting guides, and best practices',
          queryDescription:
            'Key terms to retrieve relevant integration details, like integration name, configuration values the user is having issues with, and/or any other general keywords',
          global: true,
          users: [],
        },
        telemetry,
      });

      if (entry) {
        logger.info('Integration knowledge index entry created successfully');
        return true;
      } else {
        logger.warn('Failed to create integration knowledge index entry');
        return false;
      }
    } else {
      logger.debug('Integration knowledge index entry already exists');
      return true;
    }
  } catch (error) {
    logger.error(`Error ensuring integration knowledge index entry: ${error.message}`);
    return false;
  }
};
