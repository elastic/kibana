/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useIOCDetailsContext } from '../context';

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(() => {
  const { id } = useIOCDetailsContext();
  return <div>{id}</div>;
});

OverviewTab.displayName = 'OverviewTab';
