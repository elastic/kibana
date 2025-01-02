/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiTextColor } from '@elastic/eui';

interface ComponentLoaderProps {
  text?: string;
}

import './component_loader.scss';

export const ComponentLoader: React.FC<ComponentLoaderProps> = ({ text = 'Loading...' }) => (
  <div className="componentLoader">
    <EuiLoadingSpinner size="l" />
    <EuiTextColor className="componentLoaderText" color="subdued">
      {text}
    </EuiTextColor>
  </div>
);
