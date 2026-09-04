/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { GO_TO_RULES_BUTTON_TEST_ID, HeaderSection } from './header_section';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

jest.mock('../../../../common/components/user_privileges');

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

describe('HeaderSection', () => {
  beforeEach(() => {
    mockUseUserPrivileges.mockReturnValue({
      rulesPrivileges: {
        rules: {
          read: true,
        },
      },
    });
  });

  it('should render the manage rules button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <HeaderSection />
      </TestProviders>
    );

    expect(getByTestId(GO_TO_RULES_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render the manage rules button when the user cannot read rules', () => {
    mockUseUserPrivileges.mockReturnValueOnce({
      rulesPrivileges: {
        rules: {
          read: false,
        },
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <HeaderSection />
      </TestProviders>
    );

    expect(queryByTestId(GO_TO_RULES_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
