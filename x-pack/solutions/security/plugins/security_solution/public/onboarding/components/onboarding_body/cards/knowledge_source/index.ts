/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RULES_UI_EXTERNAL_DETECTIONS_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { IconRules } from '../../../../../common/icons/rules';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { KNOWLEDGE_SOURCE_CARD_TITLE } from './translations';
import { checkKnowledgeSourceComplete } from './knowledge_source_check_complete';

export const knowledgeSourceCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.knowledgeSource,
  title: KNOWLEDGE_SOURCE_CARD_TITLE,
  icon: IconRules,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_knowledge_source_card" */
        './knowledge_source_card'
      )
  ),
  checkComplete: checkKnowledgeSourceComplete,
  capabilitiesRequired: [RULES_UI_EXTERNAL_DETECTIONS_PRIVILEGE],
};
