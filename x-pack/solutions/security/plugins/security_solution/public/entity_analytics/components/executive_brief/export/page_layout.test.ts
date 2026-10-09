/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flowBlocks } from './page_layout';

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

  it('slices a tall block with no cut points at the page height as a last resort', () => {
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

  it('moves a block without cut points to the next page when it fits there', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 500 },
        { id: 'b', height: 400 },
      ],
      PAGE,
      GAP
    );
    expect(placements[1]).toEqual({ blockId: 'b', page: 1, y: 0, sliceOffset: 0, height: 400 });
  });

  it('starts a tall card right after the glance and cuts at the largest cut point that fits', () => {
    const placements = flowBlocks(
      [
        { id: 'glance', height: 200 },
        { id: 'card', height: 900, cutPoints: [150, 300, 450, 600, 750] },
      ],
      PAGE,
      GAP
    );
    // 800 - 210 = 590 free: the largest cut point <= 590 is 450.
    expect(placements[1]).toEqual({
      blockId: 'card',
      page: 0,
      y: 210,
      sliceOffset: 0,
      height: 450,
    });
    expect(placements[2]).toEqual({
      blockId: 'card',
      page: 1,
      y: 0,
      sliceOffset: 450,
      height: 450,
    });
  });

  it('breaks a block taller than a page only at cut points', () => {
    const cutPoints = [200, 500, 700, 1000, 1300];
    const placements = flowBlocks([{ id: 'tall', height: 1600, cutPoints }], PAGE, GAP);
    expect(placements.map(({ page, sliceOffset, height }) => [page, sliceOffset, height])).toEqual([
      [0, 0, 700],
      [1, 700, 600],
      [2, 1300, 300],
    ]);
    placements.slice(1).forEach(({ sliceOffset }) => expect(cutPoints).toContain(sliceOffset));
  });

  it('falls back to a fresh page when the room left is below the minimum fragment', () => {
    const placements = flowBlocks(
      [
        { id: 'a', height: 740 },
        { id: 'b', height: 500, cutPoints: [30, 250] },
      ],
      PAGE,
      GAP
    );
    expect(placements[1]).toMatchObject({
      blockId: 'b',
      page: 1,
      y: 0,
      sliceOffset: 0,
      height: 500,
    });
  });

  it('keeps a heading with only the start of the next block', () => {
    const placements = flowBlocks(
      [
        { id: 'fill', height: 500 },
        { id: 'heading', height: 40, keepWithNext: true },
        { id: 'card', height: 900, cutPoints: [150, 400, 700] },
      ],
      PAGE,
      GAP
    );
    // 800 - 510 = 290 free; heading 40 + gap + first fragment (150) fits.
    expect(placements[1]).toMatchObject({ blockId: 'heading', page: 0, y: 510 });
    expect(placements[2]).toMatchObject({ blockId: 'card', page: 0, y: 560, height: 150 });
  });

  it('moves a heading to the next page when not even the minimum fragment fits beside it', () => {
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

  it('never scales blocks: placed heights add up to the block heights', () => {
    const blocks = [
      { id: 'a', height: 900 },
      { id: 'b', height: 1700, cutPoints: [300, 900, 1400] },
    ];
    const placements = flowBlocks(blocks, PAGE, GAP);
    blocks.forEach(({ id, height }) => {
      const total = placements
        .filter(({ blockId }) => blockId === id)
        .reduce((sum, { height: piece }) => sum + piece, 0);
      expect(total).toBeCloseTo(height);
    });
    placements.forEach(({ y, height }) => expect(y + height).toBeLessThanOrEqual(PAGE + 0.01));
  });

  it('is deterministic', () => {
    const blocks = [
      { id: 'h', height: 40, keepWithNext: true },
      { id: 'a', height: 900, cutPoints: [200, 600] },
      { id: 'b', height: 300 },
    ];
    expect(flowBlocks(blocks, PAGE, GAP)).toEqual(flowBlocks(blocks, PAGE, GAP));
  });
});
