/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';
import { ASSISTANT_CARD_TITLE } from '../common/assistant/translations';
import { checkAssistantCardComplete } from '../common/connectors/assistant_check_complete';
import type { AssistantCardMetadata } from '../common/assistant/types';

export const assistantExternalDetectionsCardConfig: OnboardingCardConfig<AssistantCardMetadata> = {
  id: OnboardingCardId.assistantExternalDetections,
  title: ASSISTANT_CARD_TITLE,
  icon: AssistantIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_assistant_external_detections_card" */
        '../common/assistant/assistant_card'
      )
  ),
  checkComplete: checkAssistantCardComplete,
  capabilitiesRequired: [
    ['securitySolutionAssistant.ai-assistant', `${SECURITY_FEATURE_ID}.external_detections`],
  ],
  licenseTypeRequired: 'enterprise',
};
