/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { KNOWLEDGE_SOURCE_CARD_TITLE } from './translations';
import { checkKnowledgeSourceComplete } from './knowledge_source_check_complete';
import rulesIcon from './images/rules_icon.png';
import rulesDarkIcon from './images/rules_icon_dark.png';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';

export const knowledgeSourceCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.knowledgeSource,
  title: KNOWLEDGE_SOURCE_CARD_TITLE,
  icon: rulesIcon,
  iconDark: rulesDarkIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_knowledge_source_card" */
        './knowledge_source_card'
      )
  ),
  checkComplete: checkKnowledgeSourceComplete,
  capabilitiesRequired: [`${SECURITY_FEATURE_ID}.external_detections`],
};
