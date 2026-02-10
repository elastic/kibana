/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSloFormContext } from '../slo_form_context';
import { ClassicDescriptionSection } from './classic_description_section';
import { FlyoutDescriptionSection } from './flyout_description_section';

export function SloEditFormDescriptionSection() {
  const { isFlyout } = useSloFormContext();
  return isFlyout ? <FlyoutDescriptionSection /> : <ClassicDescriptionSection />;
}
