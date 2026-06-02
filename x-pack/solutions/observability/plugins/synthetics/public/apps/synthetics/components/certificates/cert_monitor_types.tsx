/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Cert } from '../../../../../common/runtime_types';
import { MonitorTypeBadge } from '../common/components/monitor_type_badge';

// A certificate row is deduped across every monitor that serves it, so it can
// span more than one monitor type (e.g. the same cert seen by an HTTP monitor
// and loaded by a browser monitor). Surface the distinct set.
const getDistinctMonitorTypes = (cert: Cert): string[] => {
  const fromMonitors = (cert.monitors ?? [])
    .map((monitor) => monitor.type)
    .filter((type): type is string => Boolean(type));
  const types = fromMonitors.length > 0 ? fromMonitors : cert.monitorType ? [cert.monitorType] : [];
  return Array.from(new Set(types));
};

export const CertMonitorTypes: React.FC<{ cert: Cert }> = ({ cert }) => {
  const types = getDistinctMonitorTypes(cert);

  if (types.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {types.map((type) => (
        <EuiFlexItem key={type} grow={false}>
          <MonitorTypeBadge monitorType={type} size="s" />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
