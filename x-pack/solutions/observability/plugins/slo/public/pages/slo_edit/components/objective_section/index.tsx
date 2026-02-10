/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { ClassicObjectiveSection } from './classic_objective_section';
import { FlyoutObjectiveSection } from './flyout_objective_section';

export function SloEditFormObjectiveSection() {
  const { isFlyout } = useSloFormContext();
  return isFlyout ? <FlyoutObjectiveSection /> : <ClassicObjectiveSection />;
}
