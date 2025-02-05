/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TagsReadOnly } from './tags';

export default {
  component: TagsReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/tags',
};

export const Default = () => (
  <TagsReadOnly
    tags={['Elastic', 'Cloud', 'Google Workspace', 'Log Auditing', 'Threat Detection']}
  />
);

export const EmptyArrayValue = () => <TagsReadOnly tags={[]} />;
