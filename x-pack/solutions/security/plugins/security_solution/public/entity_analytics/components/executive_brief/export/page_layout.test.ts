/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fitScaleForTallBlock, flowBlocks } from './page_layout';

const PAGE = 800;
const GAP = 10;

describe('flowBlocks', () => {
  it('returns nothing for no blocks', () => {
    expect(flowBlocks([], PAGE, GAP)).toEqual([]);
  });

  it('flows small blocks top-down on the same page', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 100 },
        { id: 'b', height: 200 },
      ],
      PAGE,
      GAP
    );
    expect(placements).toEqual([
      { blockId: 'a', page: 0, y: 0, sliceOffset: 0, height: 100 },
      { blockId: 'b', page: 0, y: 110, sliceOffset: 0, height: 200 },
    ]);
  });

  it('starts a new page only when the next block does not fit', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 500 },
        { id: 'b', height: 250 },
        { id: 'c', height: 200 },
      ],
      PAGE,
      GAP
    );
    expect(placements.map(({ blockId, page }) => [blockId, page])).toEqual([
      ['a', 0],
      ['b', 0],
      ['c', 1],
    ]);
    expect(placements[2].y).toBe(0);
  });

  it('never slices a block that fits on a page', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 600 },
        { id: 'b', height: 700 },
      ],
      PAGE,
      GAP
    );
    expect(placements.filter(({ blockId }) => blockId === 'b')).toHaveLength(1);
    expect(placements[1].page).toBe(1);
  });

  it('starts a tall block on a partly filled page when enough room is left', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 300 },
        { id: 'tall', height: 1500 },
      ],
      PAGE,
      GAP
    );
    expect(
      placements
        .filter(({ blockId }) => blockId === 'tall')
        .map(({ page, height }) => [page, height])
    ).toEqual([
      [0, 490],
      [1, 800],
      [2, 210],
    ]);
  });

  it('slices only a block taller than a page and continues below it', () => {
    const placements = flowBlocks(
      [
        { id: 'tall', height: 1000 },
        { id: 'after', height: 100 },
      ],
      PAGE,
      GAP
    );
    expect(placements).toEqual([
      { blockId: 'tall', page: 0, y: 0, sliceOffset: 0, height: 800 },
      { blockId: 'tall', page: 1, y: 0, sliceOffset: 800, height: 200 },
      { blockId: 'after', page: 1, y: 210, sliceOffset: 0, height: 100 },
    ]);
  });

  it('keeps a heading with the start of the next block', () => {
    const placements = flowBlocks(
      [
        { id: 'fill', height: 700 },
        { id: 'heading', height: 40, keepWithNext: true },
        { id: 'card', height: 500 },
      ],
      PAGE,
      GAP
    );
    expect(placements[1]).toMatchObject({ blockId: 'heading', page: 1, y: 0 });
    expect(placements[2]).toMatchObject({ blockId: 'card', page: 1 });
  });
});

describe('fitScaleForTallBlock', () => {
  it('shrinks slightly tall blocks and leaves the rest alone', () => {
    expect(fitScaleForTallBlock(700, 800)).toBe(1);
    expect(fitScaleForTallBlock(900, 800)).toBeCloseTo(730 / 900);
    expect(fitScaleForTallBlock(2000, 800)).toBe(1);
  });
});
