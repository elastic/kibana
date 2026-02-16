/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { VerticalIndicatorSection } from './vertical_indicator_section';
import { HorizontalIndicatorSection } from './horizontal_indicator_section';

export function SloEditFormIndicatorSection() {
  const { formLayout } = useSloFormContext();
  return formLayout === 'horizontal' ? (
    <HorizontalIndicatorSection />
  ) : (
    <VerticalIndicatorSection />
  );
}
