/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const progressMessages = {
  generatingTools: () => {
    return i18n.translate(
      'xpack.observability.agent.tools.elasticsearch.progress.generatingTools',
      {
        defaultMessage: 'Dynamically generating tools based on the user query',
      }
    );
  },
  callingElasticsearchAgent: () => {
    return i18n.translate(
      'xpack.observability.agent.tools.elasticsearch.progress.callingElasticsearchAgent',
      {
        defaultMessage: 'Choosing the most appropriate Elasticsearch API',
      }
    );
  },
  performingElasticsearchTool: () => {
    return i18n.translate(
      'xpack.observability.agent.tools.elasticsearch.progress.performingElasticsearchTool',
      {
        defaultMessage: 'Executing the Elasticsearch tool',
      }
    );
  },
};
