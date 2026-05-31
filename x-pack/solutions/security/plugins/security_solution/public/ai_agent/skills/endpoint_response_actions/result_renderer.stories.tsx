/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { EuiProvider } from '@elastic/eui';

import { ResultCard } from './result_renderer';

export default {
  title: 'Skills/EndpointResponseActions/ResultCard',
  decorators: [
    (storyFn: () => React.ReactNode) => (
      <EuiProvider colorMode="light">
        <div style={{ maxWidth: 480, padding: 24 }}>{storyFn()}</div>
      </EuiProvider>
    ),
  ],
} as Meta;

export const Pending = {
  name: 'Status: pending',
  render: () => (
    <ResultCard
      result={{
        actionId: 'action-abc-001',
        status: 'pending',
        timestamp: '2024-01-15T14:32:00.000Z',
      }}
    />
  ),
};

export const Completed = {
  name: 'Status: completed',
  render: () => (
    <ResultCard
      result={{
        actionId: 'action-abc-002',
        status: 'completed',
        timestamp: '2024-01-15T14:32:15.000Z',
      }}
    />
  ),
};

export const Failed = {
  name: 'Status: failed',
  render: () => (
    <ResultCard
      result={{
        actionId: 'action-abc-003',
        status: 'failed',
        timestamp: '2024-01-15T14:32:08.000Z',
        errorMessage: 'Agent unreachable: connection timed out after 30s',
      }}
    />
  ),
};

export const AllStatuses = {
  name: 'All status badges',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ResultCard
        result={{
          actionId: 'action-001',
          status: 'pending',
          timestamp: '2024-01-15T14:32:00.000Z',
        }}
      />
      <ResultCard
        result={{
          actionId: 'action-002',
          status: 'completed',
          timestamp: '2024-01-15T14:32:15.000Z',
        }}
      />
      <ResultCard
        result={{
          actionId: 'action-003',
          status: 'failed',
          timestamp: '2024-01-15T14:32:08.000Z',
          errorMessage: 'Agent unreachable: connection timed out after 30s',
        }}
      />
    </div>
  ),
};
