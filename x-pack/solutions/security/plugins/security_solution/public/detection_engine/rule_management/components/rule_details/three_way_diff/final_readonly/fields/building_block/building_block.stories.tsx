/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BuildingBlockReadOnly } from './building_block';

export default {
  component: BuildingBlockReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/building_block',
};

export const Default = () => <BuildingBlockReadOnly buildingBlock={{ type: 'default' }} />;

export const NoValue = () => <BuildingBlockReadOnly />;
