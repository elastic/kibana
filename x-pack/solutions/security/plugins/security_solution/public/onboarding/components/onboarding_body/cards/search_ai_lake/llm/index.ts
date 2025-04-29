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
import { SECURITY_FEATURE_ID } from '../../../../../../../common/constants';
import { checkAssistantCardComplete } from '../../common/connectors/assistant_check_complete';
import type { AssistantCardMetadata } from '../../assistant/types';

export const llmConnectorCardConfig: OnboardingCardConfig<AssistantCardMetadata> = {
  id: OnboardingCardId.searchAiLakeLLM,
  title: AI_CONNECTOR_CARD_TITLE,
  icon: AssistantIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_search_ai_lake_llm_connector_card" */
        '../../common/connectors/assistant_card'
      )
  ),
  checkComplete: checkAssistantCardComplete,
  capabilitiesRequired: [`${SECURITY_FEATURE_ID}.external_detections`],
};
