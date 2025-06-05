/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  USER_UNAUTHENTICATED_TEST_ID,
  UserUnauthenticatedEmtpyPage,
} from './user_unauthenticated_empty_page';

jest.mock('../../../../common/lib/kibana');

describe('AlertsPageUserUnauthenticated', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<UserUnauthenticatedEmtpyPage />);

    expect(getByTestId(USER_UNAUTHENTICATED_TEST_ID)).toBeInTheDocument();
  });
});
