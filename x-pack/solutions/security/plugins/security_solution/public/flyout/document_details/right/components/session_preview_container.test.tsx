/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { SessionPreviewContainer } from './session_preview_container';
import { useSessionViewConfig } from '../../shared/hooks/use_session_view_config';
import { useLicense } from '../../../../common/hooks/use_license';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
} from '../../../shared/components/test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';

jest.mock('../../shared/hooks/use_session_view_config');
jest.mock('../../../../common/hooks/use_license');
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);

const mockNavigateToSessionView = jest.fn();
jest.mock('../../shared/hooks/use_navigate_to_session_view', () => {
  return { useNavigateToSessionView: () => ({ navigateToSessionView: mockNavigateToSessionView }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

const sessionViewConfig = {
  index: {},
  sessionEntityId: 'sessionEntityId',
  sessionStartTime: 'sessionStartTime',
};

const renderSessionPreview = (context = mockContextValue) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={context}>
        <SessionPreviewContainer />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('SessionPreviewContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });
  });

  it('should open left panel visualization tab when visualization in flyout flag is on', () => {
    const { getByTestId } = renderSessionPreview();

    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID)).click();

    expect(mockNavigateToSessionView).toHaveBeenCalled();
  });

  it('should not render link to session viewer if flyout is open in rule preview', () => {
    const { getByTestId, queryByTestId } = renderSessionPreview({
      ...mockContextValue,
      isRulePreview: true,
    });

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should render link to session viewer if flyout is open in preview mode', () => {
    const { getByTestId } = renderSessionPreview({
      ...mockContextValue,
      isPreviewMode: true,
    });

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID)).click();
    expect(mockNavigateToSessionView).toHaveBeenCalled();
  });
});
