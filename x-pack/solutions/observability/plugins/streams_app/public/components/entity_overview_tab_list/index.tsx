/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export function EntityOverviewTabList<
  T extends { name: string; label: string; href: string; selected: boolean }
>({ tabs }: { tabs: T[] }) {
  const theme = useEuiTheme().euiTheme;

  return (
    <EuiTabs
      size="m"
      className={css`
        padding: 0 ${theme.size.l};
      `}
    >
      {tabs.map((tab) => {
        return (
          <EuiTab key={tab.name} href={tab.href} isSelected={tab.selected}>
            {tab.label}
          </EuiTab>
        );
      })}
    </EuiTabs>
  );
}
