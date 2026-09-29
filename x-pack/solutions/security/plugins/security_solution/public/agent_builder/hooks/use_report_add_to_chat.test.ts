/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { useKibana } from '../../common/lib/kibana';
import type { AgentBuilderAddToChatTelemetry } from './use_report_add_to_chat';
import { useReportAddToChat } from './use_report_add_to_chat';

vi.mock('../../common/lib/kibana');

const mockUseKibana = useKibana as Mock;

describe('useReportAddToChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a callback that reports the AddToChatClicked event', () => {
    const reportEvent = vi.fn();
    mockUseKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent,
        },
      },
    });

    const payload: AgentBuilderAddToChatTelemetry = {
      pathway: 'rule_creation',
      attachments: ['rule'],
    };

    const { result } = renderHook(() => useReportAddToChat());

    act(() => {
      result.current(payload);
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, payload);
  });

  it('passes item_count through to reportEvent for bulk pathways', () => {
    const reportEvent = vi.fn();
    mockUseKibana.mockReturnValue({
      services: {
        telemetry: {
          reportEvent,
        },
      },
    });

    const payload: AgentBuilderAddToChatTelemetry = {
      pathway: 'bulk_alerts_alerts_page',
      attachments: ['alert'],
      item_count: 5,
    };

    const { result } = renderHook(() => useReportAddToChat());

    act(() => {
      result.current(payload);
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, payload);
  });
});
