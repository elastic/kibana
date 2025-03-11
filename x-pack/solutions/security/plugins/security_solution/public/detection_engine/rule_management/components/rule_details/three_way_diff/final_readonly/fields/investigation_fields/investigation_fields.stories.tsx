/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InvestigationFieldsReadOnly } from './investigation_fields';

export default {
  component: InvestigationFieldsReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/investigation_fields',
};

export const Default = () => (
  <InvestigationFieldsReadOnly
    investigationFields={{
      field_names: ['host.name', 'source.ip'],
    }}
  />
);

export const NoValue = () => <InvestigationFieldsReadOnly />;
