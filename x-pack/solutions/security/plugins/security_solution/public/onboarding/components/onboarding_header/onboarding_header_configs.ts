/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import type { OnboardingConfigAvailabilityProps } from '../../types';
import * as i18n from './translations';

interface HeaderConfig {
  getTitle: (name: string) => string;
  subTitle: string;
  description: string;
  capabilitiesRequired?: OnboardingConfigAvailabilityProps['capabilitiesRequired'];
}

export const defaultHeaderConfig: HeaderConfig = {
  getTitle: i18n.ONBOARDING_PAGE_TITLE,
  subTitle: i18n.ONBOARDING_PAGE_SUBTITLE,
  description: i18n.ONBOARDING_PAGE_DESCRIPTION,
  capabilitiesRequired: [`${SECURITY_FEATURE_ID}.detections`],
};

export const headerConfig: HeaderConfig[] = [
  defaultHeaderConfig,
  {
    getTitle: i18n.ONBOARDING_PAGE_TITLE,
    subTitle: i18n.ONBOARDING_SEARCH_AI_LAKE_PAGE_TITLE,
    description: i18n.ONBOARDING_SEARCH_AI_LAKE_PAGE_SUB_DESCRIPTION,
    capabilitiesRequired: [`${SECURITY_FEATURE_ID}.external_detections`],
  },
];
