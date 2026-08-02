/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../../../../components/test_utils/render_with_pnd_providers';
import type { PndSparklinePoint } from '../helpers/build_sparkline_series';
import { ProposalKpiTile } from '.';

const series: PndSparklinePoint[] = [
  { time: 1_754_524_800_000, y: 0 },
  { time: 1_754_528_400_000, y: 3 },
];

const defaultProps = {
  action: 'contain' as const,
  count: 4,
  label: 'Contain',
  onSelect: jest.fn(),
  series,
};

const tile = (): HTMLElement => screen.getByTestId('pndBriefKpiTile-contain');

describe('ProposalKpiTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names the phase the tile stands for', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(tile()).toHaveTextContent('Contain');
  });

  it('shows the pending count', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('4');
  });

  it('shows a zero rather than blanking the tile', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} count={0} />);

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('0');
  });

  it('tags the tile with the action it stands for', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(tile()).toHaveAttribute('data-recommended-action', 'contain');
  });

  /**
   * The count is what is still waiting, not what the sparkline charts — so the label says "waiting
   * on you" and never claims a 24 hour window the number does not describe.
   */
  it('announces what the count means and what pressing the tile does', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(tile()).toHaveAccessibleName('Go to Contain: 4 approvals waiting on you');
  });

  it('is reachable as a button', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(tile()).toHaveAttribute('role', 'button');
  });

  it('is reachable by keyboard', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(tile()).toHaveAttribute('tabindex', '0');
  });

  it('asks for its section when clicked', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    fireEvent.click(tile());

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('asks for its section on Enter', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    fireEvent.keyDown(tile(), { key: 'Enter' });

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('asks for its section on Space', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    fireEvent.keyDown(tile(), { key: ' ' });

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('ignores a key that is not an activation', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    fireEvent.keyDown(tile(), { key: 'a' });

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('gives the sparkline a place to draw', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(screen.getByTestId('pndBriefKpiSparkline-contain')).toBeInTheDocument();
  });

  it('labels the older edge of the 24 hour window', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(screen.getByTestId('pndBriefKpiSparklineFooter-contain')).toHaveTextContent('24h ago');
  });

  it('labels the hour still filling', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} />);

    expect(screen.getByTestId('pndBriefKpiSparklineFooter-contain')).toHaveTextContent('Now');
  });

  /**
   * With no series there is no chart, and edge labels under nothing would imply the count covers a
   * 24 hour window — which it does not.
   */
  it('drops the window labels when there is no series to bound', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} series={[]} />);

    expect(screen.queryByTestId('pndBriefKpiSparklineFooter-contain')).not.toBeInTheDocument();
  });

  it('keeps the count when there is no series', () => {
    renderWithPndProviders(<ProposalKpiTile {...defaultProps} series={[]} />);

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('4');
  });
});
