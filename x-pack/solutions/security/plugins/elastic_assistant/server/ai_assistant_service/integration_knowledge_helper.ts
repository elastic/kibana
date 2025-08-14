/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { IndexEntryType } from '@kbn/elastic-assistant-common';
import { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';

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
    const results = await kbDataClient.findDocuments({
      page: 1,
      perPage: 1,
      filter: `type:index AND index:${INTEGRATION_KNOWLEDGE_INDEX_NAME}`,
    });

    const exists =
      results?.data?.hits?.total &&
      (typeof results.data.hits.total === 'number'
        ? results.data.hits.total > 0
        : results.data.hits.total.value > 0);

    logger.debug(`Integration knowledge index entry exists: ${exists}`);
    return !!exists;
  } catch (error) {
    logger.debug(`Error checking integration knowledge index entry: ${error.message}`);
    return false;
  }
};

/**
 * Ensures the integration knowledge index entry exists during Knowledge Base setup.
 * Similar to loadSecurityLabs() but for Index Entries rather than Document Entries.
 * This version works without telemetry, similar to how addKnowledgeBaseDocuments works.
 */
export const ensureIntegrationKnowledgeIndexEntry = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient,
  logger: Logger
): Promise<boolean> => {
  try {
    logger.debug('Checking if integration knowledge index entry exists...');

    const entryExists = await checkIntegrationKnowledgeIndexEntryExists({
      kbDataClient,
      logger,
    });

    if (!entryExists) {
      logger.debug('Creating integration knowledge index entry...');

      // Create entry using the high-level createKnowledgeBaseEntry method
      // We create a minimal telemetry mock since telemetry is required but not available during setup
      const mockTelemetry = {
        reportEvent: () => {}, // No-op during setup
      } as unknown as AnalyticsServiceSetup;

      const entry = await kbDataClient.createKnowledgeBaseEntry({
        knowledgeBaseEntry: {
          type: IndexEntryType.value,
          index: INTEGRATION_KNOWLEDGE_INDEX_NAME,
          field: 'content',
          name: 'Integration Knowledge',
          description:
            'Integration knowledge base containing semantic information about integrations installed via Fleet',
          queryDescription:
            'Use this tool to search for information about integrations, integration configurations, troubleshooting guides, and best practices',
          global: true,
          users: [],
        },
        telemetry: mockTelemetry,
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
