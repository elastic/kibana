/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AiSettingsContent } from './content';
import * as i18n from './translations';
import { SideNav } from './side_nav';

export const AiSettings = () => {
  const [selectedTab, setSelectedTab] = useState(i18n.CONNECTORS);
  const { euiTheme } = useEuiTheme();

  const menuItems = [
    i18n.CONVERSATIONS,
    i18n.CONNECTORS,
    i18n.SYSTEM_PROMPTS,
    i18n.QUICK_PROMPTS,
    i18n.ANONYMIZATION,
    i18n.KNOWLEDGE_BASE,
  ];

  return (
    <EuiFlexGroup
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiFlexItem grow={false} css={{ width: '200px' }}>
        <SideNav menuItems={menuItems} selectedTab={selectedTab} onSelect={setSelectedTab} />
      </EuiFlexItem>
      <EuiFlexItem>
        <AiSettingsContent selectedTab={selectedTab} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
