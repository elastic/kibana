/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { FlyoutNavigation } from './flyout_navigation';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  FLYOUT_HISTORY_BUTTON_TEST_ID,
  HEADER_ACTIONS_TEST_ID,
} from './test_ids';
import {
  type ExpandableFlyoutApi,
  type ExpandableFlyoutState,
  type FlyoutPanelHistory,
  useExpandableFlyoutApi,
  useExpandableFlyoutHistory,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';

const expandDetails = jest.fn();
const flyoutHistory: FlyoutPanelHistory[] = [
  { lastOpen: Date.now(), panel: { id: 'id1', params: {} } },
  { lastOpen: Date.now(), panel: { id: 'id2', params: {} } },
];

const ExpandableFlyoutTestProviders: FC<PropsWithChildren<{}>> = ({ children }) => {
  return <TestProviders>{children}</TestProviders>;
};

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  useExpandableFlyoutState: jest.fn(),
  useExpandableFlyoutHistory: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

const flyoutContextValue = {
  closeLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

describe('<FlyoutNavigation />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue(flyoutHistory);
  });

  it('should render expand button', () => {
    const { getByTestId, queryByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Expand details');
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

    getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID).click();
    expect(expandDetails).toHaveBeenCalled();
  });

  it('should render collapse button', () => {
    jest
      .mocked(useExpandableFlyoutState)
      .mockReturnValue({ left: {} } as unknown as ExpandableFlyoutState);

    const { getByTestId, queryByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
      </ExpandableFlyoutTestProviders>
    );

    expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Collapse details');
    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

    getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID).click();
    expect(flyoutContextValue.closeLeftPanel).toHaveBeenCalled();
  });

  it('should not render expand details button if flyout is not expandable', () => {
    const { queryByTestId, getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={false} actions={<div />} />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render actions if there are actions available', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation
          flyoutIsExpandable={true}
          expandDetails={expandDetails}
          actions={<div />}
        />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
  });

  it('should render history button when there are more than 1 unique item in history', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={false} />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(FLYOUT_HISTORY_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render history button when there is no item in history', () => {
    jest.mocked(useExpandableFlyoutHistory).mockReturnValue([]);
    const { getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={false} />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(FLYOUT_HISTORY_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render history button if in rule preview', () => {
    const { queryByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={true} isRulePreview={true} />
      </ExpandableFlyoutTestProviders>
    );
    expect(queryByTestId(FLYOUT_HISTORY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render empty component if isPreviewMode is true', () => {
    const { container } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation
          isPreviewMode={true}
          flyoutIsExpandable={true}
          actions={<div />}
          isRulePreview={false}
        />
      </ExpandableFlyoutTestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render empty component if panel is not expandable, no action is available and is rule preview', async () => {
    const { container } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation isPreviewMode={false} flyoutIsExpandable={false} isRulePreview={true} />
      </ExpandableFlyoutTestProviders>
    );
    await act(async () => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
