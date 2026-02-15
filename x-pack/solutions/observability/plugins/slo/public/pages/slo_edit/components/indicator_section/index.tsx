/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { ClassicIndicatorSection } from './classic_indicator_section';
import { FlyoutIndicatorSection } from './flyout_indicator_section';

export function SloEditFormIndicatorSection() {
  const { isFlyout } = useSloFormContext();
  return isFlyout ? <FlyoutIndicatorSection /> : <ClassicIndicatorSection />;
}
