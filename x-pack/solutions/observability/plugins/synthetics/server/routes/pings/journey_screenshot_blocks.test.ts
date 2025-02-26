/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createJourneyScreenshotBlocksRoute } from './journey_screenshot_blocks';
import { getJourneyScreenshotBlocks } from '../../queries/get_journey_screenshot_blocks';

jest.mock('../../queries/get_journey_screenshot_blocks');

describe('createJourneyScreenshotBlocksRoute', () => {
  let route: any;

  beforeEach(() => {
    jest.clearAllMocks();
    route = createJourneyScreenshotBlocksRoute();
  });

  it('should return 200 with the screenshot blocks', async () => {
    const mockBlocks = [
      { id: 'block1', data: 'data1' },
      { id: 'block2', data: 'data2' },
    ];
    (getJourneyScreenshotBlocks as jest.Mock).mockResolvedValue(mockBlocks);

    const ok = jest.fn();
    await route.handler({
      request: { body: { hashes: ['block1', 'block2'] } },
      response: { ok },
      syntheticsEsClient: {},
    });

    expect(ok).toHaveBeenCalledWith({
      body: mockBlocks,
    });
  });

  it('should return 204 when no screenshot blocks are found', async () => {
    (getJourneyScreenshotBlocks as jest.Mock).mockResolvedValue([]);

    const noContent = jest.fn();

    await route.handler({
      request: { body: { hashes: ['block1', 'block2'] } },
      response: { noContent },
      syntheticsEsClient: {},
    });

    expect(noContent).toHaveBeenCalledWith({
      body: [],
    });
  });

  it('should return 207 when some screenshot blocks are not found', async () => {
    const mockBlocks = [{ id: 'block1', data: 'data1' }];
    (getJourneyScreenshotBlocks as jest.Mock).mockResolvedValue(mockBlocks);

    const multiStatus = jest.fn();

    await route.handler({
      request: { body: { hashes: ['block1', 'block2'] } },
      response: { multiStatus },
      syntheticsEsClient: {},
    });

    expect(multiStatus).toHaveBeenCalledWith({
      body: [
        { ...mockBlocks[0], status: 200 },
        { id: 'block2', status: 404 },
      ],
    });
  });
});
