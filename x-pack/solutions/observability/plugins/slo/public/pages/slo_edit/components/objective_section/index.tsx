/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { VerticalObjectiveSection } from './vertical_objective_section';
import { HorizontalObjectiveSection } from './horizontal_objective_section';

export function SloEditFormObjectiveSection() {
  const { formLayout } = useSloFormContext();
  return formLayout === 'horizontal' ? (
    <HorizontalObjectiveSection />
  ) : (
    <VerticalObjectiveSection />
  );
}
