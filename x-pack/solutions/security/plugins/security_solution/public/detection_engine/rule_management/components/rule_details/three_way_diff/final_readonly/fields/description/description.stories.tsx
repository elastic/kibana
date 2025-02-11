/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DescriptionReadOnly } from './description';

export default {
  component: DescriptionReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/description',
};

export const Default = () => (
  <DescriptionReadOnly description="Identifies the occurrence of a security alert from the Google Workspace alerts center. Google Workspace's security alert center provides an overview of actionable alerts that may be affecting an organization's domain. An alert is a warning of a potential security issue that Google has detected." />
);
