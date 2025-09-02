/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';

export const PageLoader = () => (
  <EuiEmptyPrompt icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />} />
);
