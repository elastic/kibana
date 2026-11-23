/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useGenerateAiBriefAction } from './use_generate_ai_brief_action';

export const GENERATE_AI_BRIEF_BUTTON_TEST_ID = 'generateAiBriefButton';

const GENERATE_AI_BRIEF_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.aiBrief.buttonLabel',
  { defaultMessage: 'Generate AI brief' }
);

/** Captures the page's view and opens Agent Builder on it. Absent when the user can't use Agent Builder. */
export const GenerateAiBriefButton: React.FC<Parameters<typeof useGenerateAiBriefAction>[0]> = (
  props
) => {
  const { isAvailable, isLoading, open } = useGenerateAiBriefAction(props);

  if (!isAvailable) return null;

  return (
    <AiButton
      variant="empty"
      size="s"
      iconType="sparkles"
      isLoading={isLoading}
      onClick={open}
      data-test-subj={GENERATE_AI_BRIEF_BUTTON_TEST_ID}
    >
      {GENERATE_AI_BRIEF_LABEL}
    </AiButton>
  );
};
