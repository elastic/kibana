/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import { SessionPreviewContainer } from './session_preview_container';
import { useSessionViewConfig } from '../../shared/hooks/use_session_view_config';
import { useLicense } from '../../../../common/hooks/use_license';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';

jest.mock('../../shared/hooks/use_session_view_config');
jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../../common/hooks/use_experimental_features');
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

const NO_DATA_MESSAGE =
  'You can only view Linux session details if you’ve enabled the Include session data setting in your Elastic Defend integration policy. Refer to Enable Session View data(external, opens in a new tab or window) for more information.';

const UPSELL_TEXT = 'This feature requires an Enterprise subscription';

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
  describe('when newExpandableFlyoutNavigationDisabled is true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useInvestigateInTimeline as jest.Mock).mockReturnValue({
        investigateInTimelineAlertClick: jest.fn(),
      });
    });

    it('should render component and link in header', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

      const { getByTestId } = renderSessionPreview();

      expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();

      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toHaveTextContent(NO_DATA_MESSAGE);
      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toHaveTextContent(UPSELL_TEXT);
    });

    it('should render error message and text in header if no sessionConfig', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(null);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

      const { getByTestId, queryByTestId } = renderSessionPreview();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toHaveTextContent(NO_DATA_MESSAGE);

      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toHaveTextContent(UPSELL_TEXT);
      expect(queryByTestId(SESSION_PREVIEW_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render upsell message in header if no correct license', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => false });

      const { getByTestId, queryByTestId } = renderSessionPreview();

      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toHaveTextContent(UPSELL_TEXT);

      expect(
        screen.queryByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toHaveTextContent(NO_DATA_MESSAGE);
      expect(queryByTestId(SESSION_PREVIEW_TEST_ID)).not.toBeInTheDocument();
    });

    it('should not render link to session viewer if flyout is open in rule preview', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

      const { getByTestId, queryByTestId } = renderSessionPreview({
        ...mockContextValue,
        isRulePreview: true,
      });

      expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
      expect(
        queryByTestId(EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
    });

    it('should not render link to session viewer if flyout is open in preview mode', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

      const { getByTestId, queryByTestId } = renderSessionPreview({
        ...mockContextValue,
        isPreviewMode: true,
      });

      expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      expect(
        queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).not.toBeInTheDocument();
    });

    it('should open left panel visualization tab when visualization in flyout flag is on', () => {
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });

      const { getByTestId } = renderSessionPreview();
      expect(
        getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
      ).toBeInTheDocument();
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID)).click();

      expect(mockNavigateToSessionView).toHaveBeenCalled();
    });
  });

  describe('when newExpandableFlyoutNavigationDisabled is false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
      (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
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
});
