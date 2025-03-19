/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { PreviewPanelFooter } from './footer';
import { PREVIEW_FOOTER_LINK_TEST_ID, PREVIEW_FOOTER_TEST_ID } from './test_ids';
import { NetworkPanelKey } from '.';
import { FlowTargetSourceDest } from '../../../common/search_strategy';
import { mockFlyoutApi } from '../document_details/shared/mocks/mock_flyout_context';

jest.mock('@kbn/expandable-flyout');

const ip = 'ip';
const flowTarget = FlowTargetSourceDest.destination;
const scopeId = 'scopeId';

describe('<PreviewPanelFooter />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should open network details flyout when clicked', () => {
    const { getByTestId } = render(
      <PreviewPanelFooter ip={ip} flowTarget={flowTarget} scopeId={scopeId} />
    );

    expect(getByTestId(PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();

    getByTestId(PREVIEW_FOOTER_LINK_TEST_ID).click();
    expect(mockFlyoutApi.openFlyout).toHaveBeenCalledWith({
      right: {
        id: NetworkPanelKey,
        params: {
          ip,
          flowTarget,
          scopeId,
        },
      },
    });
  });
});
