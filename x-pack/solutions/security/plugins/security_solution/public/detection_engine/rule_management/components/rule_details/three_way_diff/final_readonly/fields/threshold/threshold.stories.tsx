/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThresholdReadOnly } from './threshold';

export default {
  component: ThresholdReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threshold',
};

export const Default = () => (
  <ThresholdReadOnly
    threshold={{
      field: ['Responses.process.pid'],
      value: 100,
      cardinality: [{ field: 'host.id', value: 2 }],
    }}
  />
);
