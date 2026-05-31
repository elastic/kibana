/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { EuiProvider } from '@elastic/eui';

import { ConfirmationCard } from './confirmation_renderer';

const noOp = () => {};

export default {
  title: 'Skills/EndpointResponseActions/ConfirmationCard',
  decorators: [
    (storyFn: () => React.ReactNode) => (
      <EuiProvider colorMode="light">
        <div style={{ maxWidth: 480, padding: 24 }}>{storyFn()}</div>
      </EuiProvider>
    ),
  ],
} as Meta;

export const IsolateConfirmation = {
  name: 'Isolate – shows hostName',
  render: () => (
    <ConfirmationCard
      hostRef={{ hostName: 'WIN-PROD-042', agentId: 'agent-abc-123', isIsolated: false }}
      actionType="isolate"
      onConfirm={noOp}
      onCancel={noOp}
    />
  ),
};

export const UnisolateConfirmation = {
  name: 'Un-isolate – shows hostName',
  render: () => (
    <ConfirmationCard
      hostRef={{ hostName: 'WIN-PROD-042', agentId: 'agent-abc-123', isIsolated: true }}
      actionType="unisolate"
      onConfirm={noOp}
      onCancel={noOp}
    />
  ),
};

export const LongHostName = {
  name: 'Long hostname – wraps cleanly',
  render: () => (
    <ConfirmationCard
      hostRef={{
        hostName: 'VERY-LONG-HOSTNAME-IN-PRODUCTION-ENVIRONMENT-42',
        agentId: 'agent-xyz-789-qrs-456-abc',
        isIsolated: false,
      }}
      actionType="isolate"
      onConfirm={noOp}
      onCancel={noOp}
    />
  ),
};
