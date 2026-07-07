/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AttackHeaderActions } from './header_actions';
import { HEADER_SHARE_BUTTON_TEST_ID } from '../constants/test_ids';
import { TestProvidersComponent } from '../../../common/mock';
import { useGetAttackFlyoutLink } from '../hooks/use_get_attack_flyout_link';

jest.mock('../../../common/lib/kibana');
jest.mock('../hooks/use_get_attack_flyout_link');
jest.mock('../context', () => ({
  useAttackDetailsContext: () => ({
    attackId: 'a1',
    indexName: '.alerts-attack',
  }),
}));
jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: () => ({ timestamp: '2024-01-01T00:00:00.000Z' }),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const attackUrl = 'https://example.com/attack';

const renderAttackHeaderActions = () =>
  render(
    <TestProvidersComponent>
      <AttackHeaderActions />
    </TestProvidersComponent>
  );

describe('<AttackHeaderActions />', () => {
  beforeEach(() => {
    jest.mocked(useGetAttackFlyoutLink).mockReturnValue(attackUrl);
  });

  it('renders share button when url is available', () => {
    const { getByTestId } = renderAttackHeaderActions();
    expect(getByTestId(HEADER_SHARE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('does not render share button when url is null', () => {
    jest.mocked(useGetAttackFlyoutLink).mockReturnValue(null);
    const { queryByTestId } = renderAttackHeaderActions();
    expect(queryByTestId(HEADER_SHARE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
