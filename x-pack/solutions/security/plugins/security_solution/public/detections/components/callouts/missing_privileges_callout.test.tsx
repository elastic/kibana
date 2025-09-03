/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { MissingPrivilegesCallOut } from './missing_privileges_callout';
import { useMissingPrivileges } from '../../hooks/alerts/use_missing_privileges';

jest.mock('../../hooks/alerts/use_missing_privileges');

describe('MissingPrivilegesCallOut', () => {
  it('should show callout', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [['feature', ['read', 'write']]],
      indexPrivileges: [['index', ['read', 'write']]],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingPrivilegesCallOut />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
    expect(
      getByText(
        'You need the following privileges to fully access this functionality. Contact your administrator for further assistance.'
      )
    ).toBeInTheDocument();
  });
});
