/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { ActionsProps } from './actions';
import { Actions } from './actions';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
} from '../test_ids';

jest.mock('react-use/lib/useLocalStorage', () => jest.fn().mockReturnValue([false, jest.fn()]));
const SEARCH_BAR_TOUR_TITLE = 'Refine your view with search';

const mockToursIsEnabled = jest.fn(() => true);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const { notificationServiceMock } = jest.requireActual('@kbn/core/public/mocks');

  return {
    useKibana: () => ({
      services: {
        notifications: {
          ...notificationServiceMock.createStartContract(),
          tours: {
            isEnabled: mockToursIsEnabled,
          },
        },
      },
    }),
  };
});

const defaultProps: ActionsProps = {
  showToggleSearch: true,
  showInvestigateInTimeline: true,
  onSearchToggle: jest.fn(),
  onInvestigateInTimeline: jest.fn(),
  searchFilterCounter: 0,
};

beforeEach(() => {
  mockToursIsEnabled.mockReturnValue(true);
});

const renderWithProviders = (props: ActionsProps = defaultProps) => {
  return render(
    <EuiThemeProvider>
      <Actions {...props} />
    </EuiThemeProvider>
  );
};

describe('Actions component', () => {
  it('renders toggle search button', () => {
    const { getByTestId, getByLabelText } = renderWithProviders();

    expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toBeInTheDocument();
    expect(getByLabelText('Toggle search bar')).toBeInTheDocument();
  });

  it('renders investigate in timeline button', () => {
    const { getByTestId, getByLabelText } = renderWithProviders();

    expect(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).toBeInTheDocument();
    expect(getByLabelText('Investigate in timeline')).toBeInTheDocument();
  });

  it('calls onSearchToggle when toggle search button is clicked', () => {
    const { getByTestId } = renderWithProviders();

    fireEvent.click(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID));

    expect(defaultProps.onSearchToggle).toHaveBeenCalledWith(true);
  });

  it('calls onInvestigateInTimeline when investigate in timeline button is clicked', () => {
    const { getByTestId } = renderWithProviders();

    fireEvent.click(getByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID));

    expect(defaultProps.onInvestigateInTimeline).toHaveBeenCalled();
  });

  it('does not render toggle search button when showToggleSearch is false', () => {
    const { queryByTestId, queryByLabelText } = renderWithProviders({
      ...defaultProps,
      showToggleSearch: false,
    });
    expect(queryByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID)).not.toBeInTheDocument();
    expect(queryByLabelText('Toggle search bar')).not.toBeInTheDocument();
  });

  it('does not render investigate in timeline button when showInvestigateInTimeline is false', () => {
    const { queryByTestId, queryByLabelText } = renderWithProviders({
      ...defaultProps,
      showInvestigateInTimeline: false,
    });
    expect(queryByTestId(GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID)).not.toBeInTheDocument();
    expect(queryByLabelText('Investigate in timeline')).not.toBeInTheDocument();
  });

  it('does not render search filter counter badge when searchFilterCounter is equal to 0', () => {
    const { queryByText } = renderWithProviders({ ...defaultProps, searchFilterCounter: 0 });
    expect(queryByText('0')).not.toBeInTheDocument();
  });

  it('renders search filter counter badge when searchFilterCounter is greater than 0', () => {
    const { getByText } = renderWithProviders({ ...defaultProps, searchFilterCounter: 5 });
    expect(getByText('5')).toBeInTheDocument();
  });

  it('renders "99" in search filter counter badge when searchFilterCounter is equal to 99', () => {
    const { getByText } = renderWithProviders({ ...defaultProps, searchFilterCounter: 99 });
    expect(getByText('99')).toBeInTheDocument();
  });

  it('renders "99+" in search filter counter badge when searchFilterCounter is greater than 99', () => {
    const { getByText } = renderWithProviders({ ...defaultProps, searchFilterCounter: 100 });
    expect(getByText('99+')).toBeInTheDocument();
  });

  describe('search warning message', () => {
    it('should show search warning message when searchWarningMessage is provided', async () => {
      const { getByTestId, getByText, container } = renderWithProviders({
        ...defaultProps,
        searchWarningMessage: {
          title: 'Warning title',
          content: 'Warning content',
        },
      });
      expect(container.querySelector('.euiBeacon')).toBeInTheDocument();

      getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID).focus();
      await waitFor(() => {
        expect(getByText('Warning title')).toBeInTheDocument();
        expect(getByText('Warning content')).toBeInTheDocument();
      });
    });

    it('should show search warning message when search button is toggled', async () => {
      const { getByTestId, getByText, container } = renderWithProviders({
        ...defaultProps,
        searchToggled: true,
        searchWarningMessage: {
          title: 'Warning title',
          content: 'Warning content',
        },
      });

      expect(container.querySelector('.euiBeacon')).toBeInTheDocument();

      getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID).focus();
      await waitFor(() => {
        expect(getByText('Warning title')).toBeInTheDocument();
        expect(getByText('Warning content')).toBeInTheDocument();
      });
    });
  });

  describe('search bar tour', () => {
    it('opens the search bar tour when searchFilterCounter is greater than 0 and shouldShowSearchBarButtonTour is true', () => {
      let shouldShowSearchBarButtonTour = true;
      const setShouldShowSearchBarButtonTourMock = jest.fn(
        (value: boolean) => (shouldShowSearchBarButtonTour = value)
      );
      (useLocalStorage as jest.Mock).mockImplementation(() => [
        shouldShowSearchBarButtonTour,
        setShouldShowSearchBarButtonTourMock,
      ]);
      const { getByText } = renderWithProviders({
        ...defaultProps,
        searchFilterCounter: 3,
      });

      expect(getByText(SEARCH_BAR_TOUR_TITLE)).toBeInTheDocument();
      expect(setShouldShowSearchBarButtonTourMock).toBeCalled();
      expect(setShouldShowSearchBarButtonTourMock).toBeCalledWith(false);
    });

    it('does not open the search bar tour when searchFilterCounter is greater than 0 and shouldShowSearchBarButtonTour is false', () => {
      const setShouldShowSearchBarButtonTourMock = jest.fn();
      (useLocalStorage as jest.Mock).mockReturnValue([false, setShouldShowSearchBarButtonTourMock]);
      const { queryByText } = renderWithProviders({
        ...defaultProps,
        searchFilterCounter: 2,
      });

      expect(queryByText(SEARCH_BAR_TOUR_TITLE)).not.toBeInTheDocument();
      expect(setShouldShowSearchBarButtonTourMock).not.toBeCalled();
    });

    it('should not show the tour if user already toggled the search bar', () => {
      const setShouldShowSearchBarButtonTourMock = jest.fn();
      (useLocalStorage as jest.Mock).mockReturnValue([true, setShouldShowSearchBarButtonTourMock]);
      renderWithProviders({
        ...defaultProps,
        searchFilterCounter: 0,
        searchToggled: true,
      });

      expect(defaultProps.onSearchToggle).toHaveBeenCalledWith(true);
      expect(setShouldShowSearchBarButtonTourMock).toBeCalled();
      expect(setShouldShowSearchBarButtonTourMock).toBeCalledWith(false);
    });

    it('should not show the tour if tours is disabled', () => {
      mockToursIsEnabled.mockReturnValue(false);
      let shouldShowSearchBarButtonTour = true;
      const setShouldShowSearchBarButtonTourMock = jest.fn(
        (value: boolean) => (shouldShowSearchBarButtonTour = value)
      );
      (useLocalStorage as jest.Mock).mockImplementation(() => [
        shouldShowSearchBarButtonTour,
        setShouldShowSearchBarButtonTourMock,
      ]);
      const { queryByText } = renderWithProviders({
        ...defaultProps,
        searchFilterCounter: 3,
      });

      expect(queryByText(SEARCH_BAR_TOUR_TITLE)).not.toBeInTheDocument();
      expect(setShouldShowSearchBarButtonTourMock).not.toHaveBeenCalled();
    });

    it('closes the search bar tour when the search toggle button is clicked', async () => {
      let shouldShowSearchBarButtonTourState = true;
      const setShouldShowSearchBarButtonTourMock = jest.fn(
        (value: boolean) => (shouldShowSearchBarButtonTourState = value)
      );
      (useLocalStorage as jest.Mock).mockImplementation(() => [
        shouldShowSearchBarButtonTourState,
        setShouldShowSearchBarButtonTourMock,
      ]);
      const { getByTestId, getByText, queryByText } = renderWithProviders({
        ...defaultProps,
        searchFilterCounter: 1,
      });

      expect(getByText(SEARCH_BAR_TOUR_TITLE)).toBeInTheDocument();

      fireEvent.click(getByTestId(GRAPH_ACTIONS_TOGGLE_SEARCH_ID));

      await waitFor(() => {
        expect(queryByText(SEARCH_BAR_TOUR_TITLE)).not.toBeInTheDocument();
      });

      expect(setShouldShowSearchBarButtonTourMock).toBeCalled();
      expect(setShouldShowSearchBarButtonTourMock).toBeCalledWith(false);
    });
  });
});
