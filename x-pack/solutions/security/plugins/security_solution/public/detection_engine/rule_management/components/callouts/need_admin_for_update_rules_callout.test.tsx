/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  NEED_ADMIN_CALLOUT_TEST_ID,
  NeedAdminForUpdateRulesCallOut,
} from './need_admin_for_update_rules_callout';
import { useUserData } from '../../../../detections/components/user_info';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../detections/components/user_info');

describe('NeedAdminForUpdateRulesCallOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show callout', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        signalIndexMappingOutdated: true,
        hasIndexManage: false,
      },
    ]);

    const { getByTestId } = render(
      <TestProviders>
        <NeedAdminForUpdateRulesCallOut />
      </TestProviders>
    );

    const callout = getByTestId(`callout-${NEED_ADMIN_CALLOUT_TEST_ID}`);
    expect(callout).toHaveTextContent('Administration permissions required for alert migration');
    expect(callout).toHaveTextContent(
      'You are currently missing the required permissions to auto migrate your alert data. Please have your administrator visit this page one time to auto migrate your alert data.'
    );
    expect(callout).toHaveTextContent('Detections prerequisites and requirements');
    expect(callout).toHaveTextContent('Elastic Security system requirements');
  });

  it('should hide callout if signalIndexMappingOutdated is false', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        signalIndexMappingOutdated: false,
        hasIndexManage: false,
      },
    ]);

    const { queryByTestId } = render(<NeedAdminForUpdateRulesCallOut />);

    expect(queryByTestId(`callout-${NEED_ADMIN_CALLOUT_TEST_ID}`)).not.toBeInTheDocument();
  });

  it('should hide callout if hasIndexManage is true', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        signalIndexMappingOutdated: true,
        hasIndexManage: true,
      },
    ]);

    const { queryByTestId } = render(<NeedAdminForUpdateRulesCallOut />);

    expect(queryByTestId(`callout-${NEED_ADMIN_CALLOUT_TEST_ID}`)).not.toBeInTheDocument();
  });
});
