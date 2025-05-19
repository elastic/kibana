/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseStatus } from '@kbn/elastic-assistant/impl/assistant/api/knowledge_base/api';
import type { OnboardingCardCheckComplete } from '../../../../types';
import { KNOWLEDGE_SOURCE_CARD_CHECK_COMPLETE_ERROR_MESSAGE } from './translations';

export const checkKnowledgeSourceComplete: OnboardingCardCheckComplete = async ({
  http,
  notifications: { toasts },
}) => {
  const kbStatus = await getKnowledgeBaseStatus({
    http,
  });
  if (kbStatus instanceof Error) {
    toasts.addError(kbStatus, { title: KNOWLEDGE_SOURCE_CARD_CHECK_COMPLETE_ERROR_MESSAGE });
    return {
      isComplete: false,
    };
  }
  return {
    isComplete: (kbStatus?.elser_exists && kbStatus?.security_labs_exists) ?? false,
  };
};
