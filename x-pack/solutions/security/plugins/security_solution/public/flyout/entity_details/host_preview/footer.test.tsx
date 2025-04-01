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
import type { HostPreviewPanelFooterProps } from './footer';
import { HostPreviewPanelFooter } from './footer';
import { HostPanelKey } from '../shared/constants';

jest.mock('@kbn/expandable-flyout');

const mockProps: HostPreviewPanelFooterProps = {
  hostName: 'test',
  contextID: 'test-host-panel',
  scopeId: 'test-scope-id',
};

describe('<HostPreviewPanelFooter />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should render footer', () => {
    const { getByTestId } = render(<HostPreviewPanelFooter {...mockProps} />);
    expect(getByTestId('host-preview-footer')).toBeInTheDocument();
  });

  it('should open host flyout when clicked', () => {
    const { getByTestId } = render(<HostPreviewPanelFooter {...mockProps} />);

    getByTestId('open-host-flyout').click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: HostPanelKey,
        params: mockProps,
      },
    });
  });
});
