/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import { WatchFilters } from '.';

const defaultProps = {
  onWatchClick: jest.fn(),
  watchFilter: null,
  watchesLabel: 'Waiting on you from',
  workflowIds: [SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
};

describe('WatchFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one chip per watch present in the rows', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} />);

    expect(screen.getAllByTestId(/^pndBriefWatchFilter-/)).toHaveLength(2);
  });

  it('names the watch rather than showing its workflow id', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} />);

    expect(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_DEEP_ID}`)
    ).toHaveTextContent('Forensic Watch');
  });

  it('labels the row, which is what makes it read in the right tense', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} watchesLabel="Answered from" />);

    expect(screen.getByText('Answered from')).toBeInTheDocument();
  });

  it('reports the watch that was clicked', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} />);

    fireEvent.click(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(defaultProps.onWatchClick).toHaveBeenCalledWith(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
  });

  /**
   * Asserted as "the two chips look different" rather than against a class name: EUI styles the
   * badge with Emotion, so the only class on it is a content hash that changes with the theme.
   */
  it('marks the selected watch, so the one real filter on the page is visible', () => {
    renderWithPndProviders(
      <WatchFilters {...defaultProps} watchFilter={SYSTEM_SECURITY_WATCH_DEEP_ID} />
    );

    expect(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_DEEP_ID}`).className
    ).not.toBe(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`).className
    );
  });

  it('renders nothing when no row carried a watch', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} workflowIds={[]} />);

    expect(screen.queryAllByTestId(/^pndBriefWatchFilter-/)).toHaveLength(0);
  });

  it('draws no phase pill, because phases are sections now rather than a filter', () => {
    renderWithPndProviders(<WatchFilters {...defaultProps} />);

    expect(screen.queryAllByTestId(/^pndBriefBucketPill-/)).toHaveLength(0);
  });
});
