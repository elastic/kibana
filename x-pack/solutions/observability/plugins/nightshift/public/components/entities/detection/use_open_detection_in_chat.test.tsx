/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { Detection } from '@kbn/significant-events-schema';
import { useOpenDetectionInChat } from './use_open_detection_in_chat';

const mockOpenChat = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      agentBuilder: {
        openChat: mockOpenChat,
      },
    },
  }),
}));

const detection: Detection = {
  '@timestamp': '2026-10-20T11:00:00.000Z',
  detection_id: 'detection-1',
  rule_uuid: 'rule-1',
  rule_name: 'Checkout latency',
  source_id: 'source-1',
  change_point_type: 'spike',
  p_value: 0.01,
  processed: false,
};

const invalidDetections = [
  { name: 'the rule name is missing', detection: { ...detection, rule_name: undefined } },
  {
    name: 'the change point type is not canonical',
    detection: { ...detection, change_point_type: 'indeterminable' },
  },
] as const;

describe('useOpenDetectionInChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens chat with a lifecycle detection attachment', () => {
    const { result } = renderHook(() => useOpenDetectionInChat(detection));

    act(() => result.current?.());

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            data: {
              '@timestamp': detection['@timestamp'],
              detection_id: detection.detection_id,
              rule_name: detection.rule_name,
              rule_uuid: detection.rule_uuid,
              source_id: detection.source_id,
              change_point_type: detection.change_point_type,
            },
          }),
        ],
      })
    );
  });

  it.each(invalidDetections)('hides the action when $name', ({ detection: invalidDetection }) => {
    const { result } = renderHook(() => useOpenDetectionInChat(invalidDetection));

    expect(result.current).toBeUndefined();
  });
});
