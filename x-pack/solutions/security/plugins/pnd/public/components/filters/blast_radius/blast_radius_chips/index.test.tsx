/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import type { PndBlastRadiusEntity } from '../helpers/merge_discovery_entities';
import { BlastRadiusChips } from '.';

const entity = (index: number): PndBlastRadiusEntity => ({
  correlationIds: ['ad-1'],
  count: 6 - index,
  field: 'host.name',
  id: `host.name:web-${index}`,
  value: `web-${index}`,
});

/** Six entities, so a measured row has something to collapse. */
const entities: PndBlastRadiusEntity[] = new Array(6).fill(null).map((_, index) => entity(index));

const defaultProps = {
  activeEntityId: null,
  entities,
  onToggleEntity: jest.fn(),
};

const chips = (): HTMLElement[] => screen.getAllByTestId('blast-radius-chip');

/**
 * jsdom lays nothing out, so a width-gated branch only runs when a test provides the pixels. The
 * `ResizeObserver` polyfill dispatches on a `resize` event, which is what makes the row re-measure.
 *
 * 40px chips, a 40px `+N` chip and a 100px row: two chips share a row, so three chips and the `+N`
 * chip are what fit inside the two rows the collapsed row allows.
 */
const layOutAt = ({
  chipWidth,
  containerWidth,
}: {
  chipWidth: number;
  containerWidth: number;
}): void => {
  [
    ...screen.getAllByTestId('blast-radius-measure-chip'),
    screen.getByTestId('blast-radius-measure-overflow'),
  ].forEach((node) => {
    Object.defineProperty(node, 'offsetWidth', { configurable: true, value: chipWidth });
  });

  const row = screen.getByTestId('pndBlastRadiusChipRow');
  Object.defineProperty(row, 'clientWidth', { configurable: true, value: containerWidth });

  act(() => {
    row.dispatchEvent(new Event('resize'));
  });
};

describe('BlastRadiusChips', () => {
  beforeEach(() => jest.clearAllMocks());

  const render = (props: Partial<React.ComponentProps<typeof BlastRadiusChips>> = {}) =>
    renderWithPndProviders(<BlastRadiusChips {...defaultProps} {...props} />);

  it('renders one chip per entity', () => {
    render();

    expect(chips()).toHaveLength(6);
  });

  it('renders the entity value as the chip label', () => {
    render();

    expect(chips()[0]).toHaveTextContent('web-0');
  });

  it('renders the count of alerts carrying the entity', () => {
    render();

    expect(chips()[0]).toHaveTextContent('6');
  });

  /** A bare hostname read aloud says nothing about the field it came from, or about pressing it. */
  it('announces what pressing a chip does', () => {
    render();

    expect(chips()[0]).toHaveAccessibleName('Filter the queue by host.name web-0, in 6 alerts');
  });

  it('hands the pressed entity to the queue to filter by', () => {
    const onToggleEntity = jest.fn();

    render({ onToggleEntity });
    fireEvent.click(chips()[0]);

    expect(onToggleEntity).toHaveBeenCalledWith(entity(0));
  });

  it('announces the chip the queue is filtered by as pressed', () => {
    render({ activeEntityId: 'host.name:web-0' });

    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces the other chips as not pressed', () => {
    render({ activeEntityId: 'host.name:web-0' });

    expect(chips()[1]).toHaveAttribute('aria-pressed', 'false');
  });

  /** Before the row has been measured there are no grounds to claim a chip does not fit. */
  it('draws every chip before the row has been laid out', () => {
    render();

    expect(screen.queryByTestId('blast-radius-overflow')).not.toBeInTheDocument();
  });

  it('collapses the chips that do not fit into a +N chip', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });

    expect(screen.getByTestId('blast-radius-overflow')).toHaveTextContent('+3');
  });

  it('draws only the chips that fit once the row has been measured', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });

    expect(chips()).toHaveLength(3);
  });

  it('offers no +N chip when every chip fits', () => {
    render();

    layOutAt({ chipWidth: 10, containerWidth: 1000 });

    expect(screen.queryByTestId('blast-radius-overflow')).not.toBeInTheDocument();
  });

  it('reveals the rest when the +N chip is pressed', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });
    fireEvent.click(screen.getByTestId('blast-radius-overflow'));

    expect(chips()).toHaveLength(6);
  });

  it('offers a way back once the row is expanded', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });
    fireEvent.click(screen.getByTestId('blast-radius-overflow'));

    expect(screen.getByTestId('blast-radius-collapse')).toBeInTheDocument();
  });

  it('names the way back, since it is drawn as an arrow alone', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });
    fireEvent.click(screen.getByTestId('blast-radius-overflow'));

    expect(screen.getByTestId('blast-radius-collapse')).toHaveAccessibleName('Show fewer entities');
  });

  it('collapses again when the way back is pressed', () => {
    render();

    layOutAt({ chipWidth: 40, containerWidth: 100 });
    fireEvent.click(screen.getByTestId('blast-radius-overflow'));
    fireEvent.click(screen.getByTestId('blast-radius-collapse'));

    expect(chips()).toHaveLength(3);
  });

  /**
   * A filter the analyst cannot see is a filter they cannot clear, so an active chip past the
   * collapse point drags the row open rather than disappearing behind the `+N` chip.
   */
  it('keeps the chip the queue is filtered by visible even when it would be collapsed away', () => {
    render({ activeEntityId: 'host.name:web-4' });

    layOutAt({ chipWidth: 40, containerWidth: 100 });

    expect(chips()).toHaveLength(5);
  });

  /** The duplicate row the measurement reads is not a second row of chips for a screen reader. */
  it('hides the row it measures from assistive technology', () => {
    render();

    expect(screen.getByTestId('pndBlastRadiusMeasureRow')).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the chips it measures out of the tab order', () => {
    render();

    expect(screen.getAllByTestId('blast-radius-measure-chip')[0].tagName).toEqual('SPAN');
  });

  it('measures a +N chip as wide as the most chips it could ever hide', () => {
    render();

    expect(screen.getByTestId('blast-radius-measure-overflow')).toHaveTextContent('+6');
  });
});
