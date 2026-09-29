/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Subtitle } from '.';
import { TestProviders } from '../../../../../../../common/mock/test_providers';
import { getMockAttackDiscoveryAlerts } from '../../../../../mock/mock_attack_discovery_alerts';

vi.mock('../../../../../../../common/lib/kibana', () => {
      const mocked = {
      useDateFormat: vi.fn(() => 'MMM D, YYYY @ HH:mm:ss.SSS'),
      useKibana: vi.fn(() => ({ services: { upselling: {} } })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../utils/is_attack_discovery_alert', () => {
      const mocked = {
      isAttackDiscoveryAlert: vi.fn((obj) => 'generationUuid' in obj),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../loading_callout/loading_messages/get_formatted_time', () => {
      const mocked = {
      getFormattedDate: vi.fn(({ date }) => `formatted-${date}`),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./translations', () => {
      const mocked = {
      CREATED_BY_USER: (user: string) => `Created by: ${user}`,
    };
      return { ...mocked, default: mocked };
    });

const mockAlert = getMockAttackDiscoveryAlerts()[0];
const defaultProps = { attackDiscovery: mockAlert };

describe('Subtitle', () => {
  it('renders the expected formatted timestamp', () => {
    render(
      <TestProviders>
        <Subtitle {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('timestamp')).toHaveTextContent('formatted-2025-05-05T17:36:50.533Z');
  });

  it('renders the expected createdBy text', () => {
    render(
      <TestProviders>
        <Subtitle {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('createdBy')).toHaveTextContent('Created by: elastic');
  });

  it('renders createdBy with userId if userName is missing', () => {
    const alert = { ...defaultProps.attackDiscovery, userName: undefined, userId: 'user-id-123' };
    render(
      <TestProviders>
        <Subtitle attackDiscovery={alert} />
      </TestProviders>
    );
    expect(screen.getByTestId('createdBy')).toHaveTextContent('Created by: user-id-123');
  });

  it('renders createdBy as empty if both userName and userId are missing', () => {
    const alert = { ...defaultProps.attackDiscovery, userName: undefined, userId: undefined };
    render(
      <TestProviders>
        <Subtitle attackDiscovery={alert} />
      </TestProviders>
    );
    expect(screen.getByTestId('createdBy')).toBeEmptyDOMElement();
  });

  it('returns null if it is NOT an AttackDiscoveryAlert', () => {
    const notAlert = { foo: 'bar' } as unknown as typeof mockAlert;
    render(
      <TestProviders>
        <Subtitle attackDiscovery={notAlert} />
      </TestProviders>
    );
    expect(screen.queryByTestId('subtitle')).toBeNull();
  });
});
