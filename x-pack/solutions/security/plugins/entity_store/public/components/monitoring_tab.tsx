/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { EngineDescriptor } from '../types';

interface MonitoringTabProps {
  engine: EngineDescriptor;
}

export const MonitoringTab = ({ engine }: MonitoringTabProps) => {
  if (engine.status !== 'error' || !engine.components) {
    return null;
  }

  const errors = engine.components.filter((c) => 'lastError' in c && c.lastError);
  if (errors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut title="Engine error" color="danger" iconType="error">
        {errors.map((c) => (
          <p key={c.id}>{`[${c.id}] ${c.lastError}`}</p>
        ))}
      </EuiCallOut>
    </>
  );
};
