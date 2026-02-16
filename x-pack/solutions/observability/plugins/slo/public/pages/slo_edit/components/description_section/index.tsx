/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { VerticalDescriptionSection } from './vertical_description_section';
import { HorizontalDescriptionSection } from './horizontal_description_section';

export function SloEditFormDescriptionSection() {
  const { formLayout } = useSloFormContext();
  return formLayout === 'horizontal' ? (
    <HorizontalDescriptionSection />
  ) : (
    <VerticalDescriptionSection />
  );
}
