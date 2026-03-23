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
      'xpack.observabilityAgentBuilder.tools.elasticsearch.progress.generatingTools',
      {
        defaultMessage: 'Searching Elasticsearch API documentation',
      }
    );
  },
  callingElasticsearchAgent: () => {
    return i18n.translate(
      'xpack.observabilityAgentBuilder.tools.elasticsearch.progress.callingElasticsearchAgent',
      {
        defaultMessage: 'Selecting the Elasticsearch API to call',
      }
    );
  },
  performingElasticsearchTool: () => {
    return i18n.translate(
      'xpack.observabilityAgentBuilder.tools.elasticsearch.progress.performingElasticsearchTool',
      {
        defaultMessage: 'Querying Elasticsearch',
      }
    );
  },
};
