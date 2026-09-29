/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useHistory, useParams } from 'react-router-dom';
import SiemReadinessDashboard from '.';
import { useKibana } from '../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../common/lib/telemetry/events/siem_readiness/types';

vi.mock('../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-router-dom', () => {
      const mocked = {
      useHistory: vi.fn(),
      useParams: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-use/lib/useLocalStorage', () => vi.fn(() => [[], vi.fn()]));
vi.mock('@kbn/siem-readiness', () => {
      const mocked = { ALL_CATEGORIES: [] };
      return { ...mocked, default: mocked };
    });
vi.mock('./visibility_section_boxes', () => {
      const mocked = {
      VisibilitySectionBoxes: ({ onTabSelect }: { onTabSelect: (id: string) => void }) => (
        <button type="button" onClick={() => onTabSelect('quality')}>
          {'box-tab'}
        </button>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./visibility_section_tabs', () => {
      const mocked = {
      VisibilitySectionTabs: ({ onTabSelect }: { onTabSelect: (id: string) => void }) => (
        <button type="button" onClick={() => onTabSelect('continuity')}>
          {'nav-tab'}
        </button>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/configuration_panel', () => {
      const mocked = {
      CategoryConfigurationPanel: () => null,
      ACTIVE_CATEGORIES_STORAGE_KEY: 'test-key',
    };
      return { ...mocked, default: mocked };
    });

const mockPush = vi.fn();
const mockReportEvent = vi.fn();

describe('SiemReadinessDashboard telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useHistory as Mock).mockReturnValue({ push: mockPush });
    (useParams as Mock).mockReturnValue({ tab: undefined });
    (useKibana as Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  it('reports TabVisited when a tab box is clicked', () => {
    const { getByText } = render(<SiemReadinessDashboard />);
    getByText('box-tab').click();
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.TabVisited, {
      tabId: 'quality',
    });
  });

  it('reports TabVisited when a nav tab is clicked', () => {
    const { getByText } = render(<SiemReadinessDashboard />);
    getByText('nav-tab').click();
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.TabVisited, {
      tabId: 'continuity',
    });
  });

  it('navigates to the correct tab path after reporting', () => {
    const { getByText } = render(<SiemReadinessDashboard />);
    getByText('nav-tab').click();
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('continuity'));
  });
});
