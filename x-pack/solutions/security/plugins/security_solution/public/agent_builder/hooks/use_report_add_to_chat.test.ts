/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useKibana } from '../../common/lib/kibana';
import type { AgentBuilderAddToChatTelemetry } from './use_report_add_to_chat';
import { useReportAddToChat } from './use_report_add_to_chat';

jest.mock('../../common/lib/kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useReportAddToChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a callback that reports the AddToChatClicked event', () => {
    const reportEvent = jest.fn();
    mockUseKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent,
        },
      },
    });

    const payload: AgentBuilderAddToChatTelemetry = {
      pathway: 'rules_table',
      attachments: ['rule'],
    };

    const { result } = renderHook(() => useReportAddToChat());

    act(() => {
      result.current(payload);
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, payload);
  });
});
