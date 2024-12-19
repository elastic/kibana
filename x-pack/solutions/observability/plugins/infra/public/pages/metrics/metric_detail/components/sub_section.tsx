/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { isValidElement, cloneElement, FunctionComponent, Children, useMemo } from 'react';
import { EuiTitle } from '@elastic/eui';
import { InventoryMetric } from '@kbn/metrics-data-access-plugin/common';
import { LayoutProps } from '../types';

type SubSectionProps = LayoutProps & {
  id: InventoryMetric;
  label?: string;
};

export const SubSection: FunctionComponent<React.PropsWithChildren<SubSectionProps>> = ({
  id,
  label,
  children,
  metrics,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}) => {
  const metric = useMemo(() => metrics?.find((m) => m.id === id), [id, metrics]);

  if (!children || !metric) {
    return null;
  }

  const childrenWithProps = Children.map(children, (child) => {
    if (isValidElement(child)) {
      return cloneElement(child, {
        // @ts-expect-error upgrade typescript v4.9.5
        metric,
        id,
        onChangeRangeTime,
        isLiveStreaming,
        stopLiveStreaming,
      });
    }
    return null;
  });

  return (
    <div style={{ margin: '10px 0 16px 0' }} id={id}>
      {label ? (
        <EuiTitle size="s">
          <h4>{label}</h4>
        </EuiTitle>
      ) : null}
      {childrenWithProps}
    </div>
  );
};
