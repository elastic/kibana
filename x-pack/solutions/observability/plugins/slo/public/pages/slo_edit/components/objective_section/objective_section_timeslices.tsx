/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimesliceTargetField } from './timeslice_target_field';
import { TimesliceWindowField } from './timeslice_window_field';

export function SloEditFormObjectiveSectionTimeslices() {
  return (
    <>
      <TimesliceTargetField />
      <TimesliceWindowField />
    </>
  );
}
