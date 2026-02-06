/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import { countDownTest } from '@kbn/detections-response-ftr-services';
import { getConversationsApis } from './apis';
import { getSimpleConversation } from '../mocks';

export const createConversations = async ({
  count,
  kibanaSpace = 'default',
  supertest,
}: {
  count: number;
  kibanaSpace?: string;
  supertest: SuperTest.Agent;
}) => {
  const conversationsToCreate = new Array(count)
    .fill(0)
    .map((_, index) => getSimpleConversation({ title: `Test Conversation - ${index}` }));
  const createdConversations = await Promise.all(
    conversationsToCreate.map((conversation) => {
      const conversationApis = getConversationsApis({ supertest });
      return conversationApis.create({ conversation, kibanaSpace });
    })
  );
  return { conversationsToCreate, createdConversations };
};

export const deleteAllConversations = async ({
  kibanaSpace = 'default',
  log,
  supertest,
}: {
  kibanaSpace?: string;
  log: ToolingLog;
  supertest: SuperTest.Agent;
}): Promise<void> => {
  const conversationApis = getConversationsApis({ supertest });
  await countDownTest(
    async () => {
      const { data, total } = await conversationApis.find({
        query: { page: 1, per_page: 100 },
        kibanaSpace,
      });

      await Promise.all(
        (data as Array<{ id: string }>).map(({ id }) => {
          return conversationApis.delete({ id, kibanaSpace });
        })
      );

      return {
        passed: total - data.length === 0,
      };
    },
    'deleteAllConversations',
    log,
    50,
    1000
  );
};

export const getConversationNotFoundError = (conversationId: string) => {
  return {
    message: `conversation id: "${conversationId}" not found`,
    status_code: 404,
  };
};

export const getConversationBadRequestError = (attributeName: string) => {
  return {
    error: 'Bad Request',
    message: `[request body]: ${attributeName}: Required`,
    statusCode: 400,
  };
};

export const getMissingAssistantKibanaPrivilegesError = ({
  routeDetails,
}: {
  routeDetails: string;
}) => {
  return {
    error: 'Forbidden',
    message: `API [${routeDetails}] is unauthorized for user, this action is granted by the Kibana privileges [elasticAssistant]`,
    statusCode: 403,
  };
};
