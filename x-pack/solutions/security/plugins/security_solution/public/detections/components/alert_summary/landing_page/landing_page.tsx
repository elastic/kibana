/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { EuiText } from '@elastic/eui';

export const LANDING_PAGE_PROMPT_TEST_ID = 'alert-summary-landing-page-prompt';

export interface LandingPageProps {
  /**
   * List of available AI for SOC integrations
   */
  packages: PackageListItem[];
}

/**
 * Displays a gif of the alerts summary page, with empty prompt showing the top 2 available AI for SOC packages.
 * This page is rendered when no AI for SOC packages are installed.
 */
export const LandingPage = memo(({ packages }: LandingPageProps) => {
  return <EuiText data-test-subj={LANDING_PAGE_PROMPT_TEST_ID}>{'Landing page'}</EuiText>;
});

LandingPage.displayName = 'LandingPage';
