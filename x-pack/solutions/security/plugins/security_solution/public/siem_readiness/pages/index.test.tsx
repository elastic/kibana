/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useHistory, useParams } from 'react-router-dom';
import SiemReadinessDashboard from '.';
import { useKibana } from '../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../common/lib/telemetry/events/siem_readiness/types';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
  useParams: jest.fn(),
}));
jest.mock('react-use/lib/useLocalStorage', () => jest.fn(() => [[], jest.fn()]));
jest.mock('@kbn/siem-readiness', () => ({ ALL_CATEGORIES: [] }));
jest.mock('./visibility_section_boxes', () => ({
  VisibilitySectionBoxes: ({ onTabSelect }: { onTabSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onTabSelect('quality')}>
      {'box-tab'}
    </button>
  ),
}));
jest.mock('./visibility_section_tabs', () => ({
  VisibilitySectionTabs: ({ onTabSelect }: { onTabSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onTabSelect('continuity')}>
      {'nav-tab'}
    </button>
  ),
}));
jest.mock('./components/configuration_panel', () => ({
  CategoryConfigurationPanel: () => null,
  ACTIVE_CATEGORIES_STORAGE_KEY: 'test-key',
}));

const mockPush = jest.fn();
const mockReportEvent = jest.fn();

describe('SiemReadinessDashboard telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHistory as jest.Mock).mockReturnValue({ push: mockPush });
    (useParams as jest.Mock).mockReturnValue({ tab: undefined });
    (useKibana as jest.Mock).mockReturnValue({
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
