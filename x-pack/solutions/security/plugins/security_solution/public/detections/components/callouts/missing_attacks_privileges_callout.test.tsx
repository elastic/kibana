/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MissingAttacksPrivilegesCallOut } from './missing_attacks_privileges_callout';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import { useGetMissingIndexPrivileges } from '../../../attack_discovery/pages/use_get_missing_index_privileges';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../../../common/hooks/use_missing_privileges');
jest.mock('../../../attack_discovery/pages/use_get_missing_index_privileges');
jest.mock('../../../common/components/callouts', () => {
  const original = jest.requireActual('../../../common/components/callouts');
  return {
    ...original,
    CallOutSwitcher: jest.fn(({ message }) => (
      <div>
        <h1>{message.title}</h1>
        <div>{message.description}</div>
      </div>
    )),
  };
});

describe('MissingPrivilegesCallOut', () => {
  beforeEach(() => {
    (useMissingPrivileges as jest.Mock).mockClear();
    (useGetMissingIndexPrivileges as jest.Mock).mockClear();
  });

  it('renders nothing when there are no missing privileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [],
    });
    (useGetMissingIndexPrivileges as jest.Mock).mockReturnValue({
      data: [],
    });

    const { container } = render(
      <TestProviders>
        <MissingAttacksPrivilegesCallOut />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders a callout when there are missing feature privileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [['test-feature', ['read']]],
      indexPrivileges: [],
    });
    (useGetMissingIndexPrivileges as jest.Mock).mockReturnValue({
      data: [],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingAttacksPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('renders a callout when there are missing index privileges from useMissingPrivileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [['.alerts-security.alerts-default', ['read']]],
    });
    (useGetMissingIndexPrivileges as jest.Mock).mockReturnValue({
      data: [],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingAttacksPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('renders a callout when there are missing index privileges from useGetMissingIndexPrivileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [],
    });
    (useGetMissingIndexPrivileges as jest.Mock).mockReturnValue({
      data: [{ index_name: 'test-index', privileges: ['read'] }],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingAttacksPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('renders a callout when there are missing index privileges from both hooks', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [['.alerts-security.alerts-default', ['read']]],
    });
    (useGetMissingIndexPrivileges as jest.Mock).mockReturnValue({
      data: [{ index_name: 'test-index', privileges: ['read'] }],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingAttacksPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });
});
