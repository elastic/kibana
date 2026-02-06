/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { MissingDetectionsPrivilegesCallOut } from './missing_detections_privileges_callout';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';

jest.mock('../../../common/hooks/use_missing_privileges');

describe('MissingDetectionsPrivilegesCallOut', () => {
  it('should show callout', () => {
    (useMissingPrivileges as jest.Mock).mockReturnValue({
      featurePrivileges: [['feature', ['read', 'write']]],
      indexPrivileges: [['index', ['read', 'write']]],
    });

    const { getByText } = render(
      <TestProviders>
        <MissingDetectionsPrivilegesCallOut />
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
