/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RequiredFieldsReadOnly } from './required_fields';

export default {
  component: RequiredFieldsReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/required_fields',
};

export const Default = () => (
  <RequiredFieldsReadOnly
    requiredFields={[
      { name: 'event.kind', type: 'keyword', ecs: true },
      { name: 'event.module', type: 'keyword', ecs: true },
    ]}
  />
);

export const EmptyArrayValue = () => <RequiredFieldsReadOnly requiredFields={[]} />;
