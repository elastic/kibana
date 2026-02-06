/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SloDetailsFlyoutDefinition } from './flyout_definition';
import { SloDetailsPageDefinition } from './page_definition';
import type { SloDetailsDefinitionProps } from './types';

interface Props extends SloDetailsDefinitionProps {
  isFlyout?: boolean;
}

export function SloDetailsDefinition({ slo, isFlyout }: Props) {
  if (isFlyout) {
    return <SloDetailsFlyoutDefinition slo={slo} />;
  }

  return <SloDetailsPageDefinition slo={slo} />;
}
