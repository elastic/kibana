/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { mockFlyoutApi } from '../../document_details/shared/mocks/mock_flyout_context';
import type { UserPreviewPanelFooterProps } from './footer';
import { UserPreviewPanelFooter } from './footer';
import { UserPanelKey } from '../shared/constants';

jest.mock('@kbn/expandable-flyout');

const mockProps: UserPreviewPanelFooterProps = {
  userName: 'test',
  contextID: 'test-user-panel',
  scopeId: 'test-scope-id',
};

describe('<UserPreviewPanelFooter />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should render footer', () => {
    const { getByTestId } = render(<UserPreviewPanelFooter {...mockProps} />);
    expect(getByTestId('user-preview-footer')).toBeInTheDocument();
  });

  it('should open user flyout when clicked', () => {
    const { getByTestId } = render(<UserPreviewPanelFooter {...mockProps} />);

    getByTestId('open-user-flyout').click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: UserPanelKey,
        params: mockProps,
      },
    });
  });
});
