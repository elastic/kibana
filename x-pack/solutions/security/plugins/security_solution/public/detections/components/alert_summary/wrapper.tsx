/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { EuiText } from '@elastic/eui';

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alert-summary-data-view-loading-prompt';

export interface WrapperProps {
  /**
   * List of installed Ai for SOC integrations
   */
  packages: PackageListItem[];
}

/**
 * Creates a new dataView with the alert indices while displaying a loading skeleton.
 * Display the alert summary page content if the dataView is correctly created.
 * This page is rendered when there are AI for SOC packages installed.
 */
export const Wrapper = memo(({ packages }: WrapperProps) => {
  return <EuiText data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}>{'Wrapper'}</EuiText>;
});

Wrapper.displayName = 'Wrapper';
