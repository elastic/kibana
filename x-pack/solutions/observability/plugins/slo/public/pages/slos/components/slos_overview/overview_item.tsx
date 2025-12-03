/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiStat, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export function OverviewItem({
  title,
  description,
  titleColor,
  isLoading,
  query,
  tooltip,
  onClick,
}: {
  title?: string | number;
  description: string;
  titleColor: string;
  isLoading: boolean;
  query?: string;
  tooltip?: string;
  onClick?: () => void;
}) {
  const { onStateChange } = useUrlSearchState();

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={tooltip}>
        <EuiStat
          title={title}
          description={description}
          titleColor={titleColor}
          reverse={true}
          isLoading={isLoading}
          onClick={() => {
            if (onClick) {
              onClick();
              return;
            }
            onStateChange({
              kqlQuery: query,
            });
          }}
          css={{
            cursor: 'pointer',
          }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
