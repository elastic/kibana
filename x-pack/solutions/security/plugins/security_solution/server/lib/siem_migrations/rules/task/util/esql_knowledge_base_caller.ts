/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { naturalLanguageToEsql, type InferenceClient } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';

export type EsqlKnowledgeBaseCaller = (input: string) => Promise<string>;

type GetEsqlTranslatorToolParams = (params: {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}) => EsqlKnowledgeBaseCaller;

export const getEsqlKnowledgeBase: GetEsqlTranslatorToolParams =
  ({ inferenceClient: client, connectorId, logger }) =>
  async (input: string) => {
    const { content } = await lastValueFrom(
      naturalLanguageToEsql({
        client,
        connectorId,
        input,
        logger: {
          debug: (source) => {
            logger.debug(typeof source === 'function' ? source() : source);
          },
        },
      })
    );
    return content;
  };
