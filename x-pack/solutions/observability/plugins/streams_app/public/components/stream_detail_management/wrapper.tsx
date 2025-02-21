/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/css';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export type ManagementTabs = Record<
  string,
  {
    content: JSX.Element;
    label: string;
  }
>;

export function Wrapper({
  tabs,
  streamId,
  subtab,
}: {
  tabs: ManagementTabs;
  streamId: string;
  subtab: string;
}) {
  const router = useStreamsAppRouter();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      className={css`
        max-width: 100%;
      `}
    >
      {Object.keys(tabs).length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Management tabs"
            idSelected={subtab}
            onChange={(optionId) => {
              router.push('/{key}/management/{subtab}', {
                path: { key: streamId, subtab: optionId },
                query: {},
              });
            }}
            options={Object.keys(tabs).map((id) => ({
              id,
              label: tabs[id].label,
            }))}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        className={css`
          overflow: auto;
        `}
        grow
      >
        {tabs[subtab].content}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
