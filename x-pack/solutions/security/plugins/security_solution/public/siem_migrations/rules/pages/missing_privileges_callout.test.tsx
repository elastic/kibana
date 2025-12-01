/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MissingPrivilegesCallOut } from './missing_privileges_callout';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import { useGetMigrationMissingPrivileges } from '../logic/use_get_migration_privileges';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../../../common/hooks/use_missing_privileges');
jest.mock('../logic/use_get_migration_privileges');

describe('MissingPrivilegesCallOut', () => {
  it('renders nothing when there are no missing privileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [],
    });
    (useGetMigrationMissingPrivileges as jest.Mock).mockReturnValue({
      data: [],
    });

    const { container } = render(
      <TestProviders>
        <MissingPrivilegesCallOut />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders a callout when there are missing feature privileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [['test-feature', ['read']]],
      indexPrivileges: [],
    });
    (useGetMigrationMissingPrivileges as jest.Mock).mockReturnValue({
      data: [],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('renders a callout when there are missing index privileges', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [],
      indexPrivileges: [],
    });
    (useGetMigrationMissingPrivileges as jest.Mock).mockReturnValue({
      data: [{ indexName: 'test-index', privileges: ['read'] }],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });
});
