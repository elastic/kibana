/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_FIELDS_ALLOWED = i18n.translate(
  'xpack.elasticAssistantPlugin.attackDiscovery.defaultAttackDiscoveryGraph.nodes.retriever.helpers.throwIfInvalidAnonymization.noFieldsAllowedErrorMessage',
  {
    defaultMessage:
      'Your Security AI Anonymization settings are configured to not allow any fields. Fields must be allowed to generate Attack discoveries.',
  }
);

export const ID_FIELD_REQUIRED = i18n.translate(
  'xpack.elasticAssistantPlugin.attackDiscovery.defaultAttackDiscoveryGraph.nodes.retriever.helpers.throwIfInvalidAnonymization.idFieldRequiredErrorMessage',
  {
    defaultMessage:
      'Your Security AI Anonymization settings are configured to not allow the _id field. The _id field must be allowed to generate Attack discoveries.',
  }
);
