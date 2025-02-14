/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import {
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import { PREVIEW_FOOTER_TEST_ID } from './test_ids';
import { NetworkPanel } from '.';
import { FlowTargetSourceDest } from '../../../common/search_strategy';
import { mockFlyoutApi } from '../document_details/shared/mocks/mock_flyout_context';
import { TestProviders } from '../../common/mock';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../common/hooks/use_experimental_features');

const ip = 'ip';
const flowTarget = FlowTargetSourceDest.destination;
const scopeId = 'scopeId';

describe('<NetworkPanel />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue([]);
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({});
  });

  it('should not show footer if non-preview mode', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <NetworkPanel ip={ip} flowTarget={flowTarget} scopeId={scopeId} isPreviewMode={false} />
      </TestProviders>
    );

    expect(queryByTestId(PREVIEW_FOOTER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show footer if preview mode', () => {
    const { getByTestId } = render(
      <TestProviders>
        <NetworkPanel ip={ip} flowTarget={flowTarget} scopeId={scopeId} isPreviewMode={true} />
      </TestProviders>
    );

    expect(getByTestId(PREVIEW_FOOTER_TEST_ID)).toBeInTheDocument();
  });
});
