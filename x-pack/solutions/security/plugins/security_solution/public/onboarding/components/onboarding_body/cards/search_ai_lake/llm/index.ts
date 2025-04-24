/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { OnboardingCardConfig } from '../../../../../types';
import { OnboardingCardId } from '../../../../../constants';
import { AI_CONNECTOR_CARD_TITLE } from './translations';
import type { AIConnectorCardMetadata } from './types';
import { SECURITY_FEATURE_ID } from '../../../../../../../common/constants';
import { checkAssistantCardComplete } from '../../common/connectors/assistant_check_complete';

export const llmConnectorCardConfig: OnboardingCardConfig<AIConnectorCardMetadata> = {
  id: OnboardingCardId.searchAiLakeLLM,
  title: AI_CONNECTOR_CARD_TITLE,
  icon: AssistantIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_search_ai_lake_llm_connector_card" */
        './llm_connector_card'
      )
  ),
  checkComplete: checkAssistantCardComplete,
  capabilitiesRequired: [`${SECURITY_FEATURE_ID}.external_detections`],
};
