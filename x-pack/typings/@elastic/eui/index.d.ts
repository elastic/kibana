/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
import React, { ReactNode } from 'react';

interface EuiSideNavItem {
  id: string;
  name: string;
  isSelected?: boolean;
  renderItem?: () => ReactNode;
  forceOpen?: boolean;
  items?: EuiSideNavItem[];
  onClick: () => void;
}

declare module '@elastic/eui' {
  export const EuiDescribedFormGroup: React.SFC<any>;
  export const EuiCodeEditor: React.SFC<any>;
  export const Query: any;
  export const EuiCard: any;

  export const EuiSideNav: React.Component<{
    items: EuiSideNavItem[];
    renderItem: () => ReactNode;
  }>;
}
