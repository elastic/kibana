/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import React from 'react';

export const SideNav = ({ menuItems, selectedTab, onSelect }) => (
  <EuiListGroup flush>
    {menuItems.map((item) => (
      <EuiListGroupItem
        key={item}
        label={item}
        onClick={() => onSelect(item)}
        isActive={selectedTab === item}
        size="s"
        css={{ fontWeight: selectedTab === item ? 'bold' : 'normal' }}
      />
    ))}
  </EuiListGroup>
);
