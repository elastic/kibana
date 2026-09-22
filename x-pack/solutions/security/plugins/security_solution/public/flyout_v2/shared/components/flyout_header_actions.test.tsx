/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutHeaderActions } from './flyout_header_actions';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { useFlyoutSessionContext } from '../../session_context';

jest.mock('./settings_menu', () => ({
  SettingsMenu: () => <div data-test-subj="mockSettingsMenu" />,
}));

jest.mock('../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
}));

jest.mock('../../session_context', () => ({
  useFlyoutSessionContext: jest.fn(),
}));

const mockUseIsInSecurityApp = useIsInSecurityApp as jest.Mock;
const mockUseFlyoutSessionContext = useFlyoutSessionContext as jest.Mock;

describe('<FlyoutHeaderActions />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to a main flyout; the child-flyout case overrides below.
    mockUseFlyoutSessionContext.mockReturnValue({
      session: 'start',
      historyKey: Symbol('history'),
      isChildFlyout: false,
    });
  });

  it('renders the settings menu inside the Security Solution app', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    const { getByTestId } = render(<FlyoutHeaderActions />);

    expect(getByTestId('mockSettingsMenu')).toBeInTheDocument();
  });

  it('renders children', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    const { getByTestId } = render(
      <FlyoutHeaderActions>
        <div data-test-subj="mockChild" />
      </FlyoutHeaderActions>
    );

    expect(getByTestId('mockChild')).toBeInTheDocument();
  });

  it('renders children even outside the Security Solution app', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const { getByTestId, queryByTestId } = render(
      <FlyoutHeaderActions>
        <div data-test-subj="mockChild" />
      </FlyoutHeaderActions>
    );

    expect(getByTestId('mockChild')).toBeInTheDocument();
    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
  });

  it('renders nothing outside the Security Solution app with no children', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const { container, queryByTestId } = render(<FlyoutHeaderActions />);

    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render the settings menu in a child flyout (its controls are inert there)', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUseFlyoutSessionContext.mockReturnValue({
      session: 'inherit',
      historyKey: Symbol('history'),
      isChildFlyout: true,
    });
    const { queryByTestId } = render(<FlyoutHeaderActions />);

    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
  });

  it('still renders children in a child flyout, without the settings menu', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    mockUseFlyoutSessionContext.mockReturnValue({
      session: 'inherit',
      historyKey: Symbol('history'),
      isChildFlyout: true,
    });
    const { getByTestId, queryByTestId } = render(
      <FlyoutHeaderActions>
        <div data-test-subj="mockChild" />
      </FlyoutHeaderActions>
    );

    expect(getByTestId('mockChild')).toBeInTheDocument();
    expect(queryByTestId('mockSettingsMenu')).not.toBeInTheDocument();
  });
});
