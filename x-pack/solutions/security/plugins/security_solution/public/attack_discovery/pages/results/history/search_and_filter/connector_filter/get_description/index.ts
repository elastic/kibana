/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

export const getDescription = (actionTypeId: string | undefined): string | undefined => {
  switch (actionTypeId) {
    case '.bedrock':
      return i18n.AMAZON_BEDROCK;
    case '.gemini':
      return i18n.GOOGLE_GEMINI;
    case '.gen-ai':
      return i18n.OPENAI;
    default:
      return undefined;
  }
};
