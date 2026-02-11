/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SloDetailsFlyoutDefinition } from './flyout_definition';
import { SloDetailsPageDefinition } from './page_definition';
import { useSloDetailsContext } from '../slo_details_context';

export function SloDetailsDefinition() {
  const { isFlyout } = useSloDetailsContext();

  if (isFlyout) {
    return <SloDetailsFlyoutDefinition />;
  }

  return <SloDetailsPageDefinition />;
}
