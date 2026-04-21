/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { HostPanelFooter } from './footer';
import { TestProviders } from '../../../common/mock';

// Capture the kqlQuery passed to TakeAction so we can assert its value
jest.mock('../shared/components/take_action', () => ({
  TakeAction: ({ kqlQuery, isDisabled }: { kqlQuery: string; isDisabled?: boolean }) => (
    <div
      data-test-subj="take-action"
      data-kql-query={kqlQuery}
      data-disabled={String(!!isDisabled)}
    />
  ),
}));

describe('HostPanelFooter', () => {
  it('builds the timeline KQL using host.name when identityFields contains host.name', () => {
    const { getByTestId } = render(
      <HostPanelFooter hostName="test-host" identityFields={{ 'host.name': 'test-host' }} />,
      { wrapper: TestProviders }
    );
    expect(getByTestId('take-action').getAttribute('data-kql-query')).toBe(
      'host.name: "test-host"'
    );
  });

  it('builds the timeline KQL using hostName prop when identityFields only has host.id (entity store v2 scenario)', () => {
    // Entity store v2: host is identified by host.id (higher EUID rank), so identityFields = { 'host.id': 'some-uuid' }
    // The footer must NOT fall back to using the host.id value as host.name
    const { getByTestId } = render(
      <HostPanelFooter hostName="real-hostname" identityFields={{ 'host.id': 'some-uuid-1234' }} />,
      { wrapper: TestProviders }
    );
    const kqlQuery = getByTestId('take-action').getAttribute('data-kql-query');
    expect(kqlQuery).toBe('host.name: "real-hostname"');
    expect(kqlQuery).not.toContain('some-uuid-1234');
  });

  it('disables the Take Action button when hostName is empty and identityFields has no host.name', () => {
    const { getByTestId } = render(
      <HostPanelFooter hostName="" identityFields={{ 'host.id': 'some-uuid-1234' }} />,
      { wrapper: TestProviders }
    );
    expect(getByTestId('take-action').getAttribute('data-disabled')).toBe('true');
  });
});
