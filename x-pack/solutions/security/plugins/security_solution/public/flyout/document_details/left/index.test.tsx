/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { LeftPanelTabType } from './tabs';
import { LeftPanel } from '.';
import { DocumentDetailsContext } from '../shared/context';
import { mockContextValue } from '../shared/mocks/mock_context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { DocumentEventTypes } from '../../../common/lib/telemetry/types';

const mockOpenLeftPanel = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openLeftPanel: mockOpenLeftPanel }),
}));

jest.mock('../../../common/components/user_privileges');

const mockReportEvent = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { telemetry: { reportEvent: mockReportEvent } } }),
}));

jest.mock('./header', () => ({
  PanelHeader: ({
    tabs,
    selectedTabId,
    setSelectedTabId,
  }: {
    tabs: LeftPanelTabType[];
    selectedTabId: string;
    setSelectedTabId: (id: string) => void;
  }) => (
    <div
      data-test-subj="mockPanelHeader"
      data-tab-ids={tabs.map((t) => t.id).join(',')}
      data-selected-tab={selectedTabId}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-test-subj={`tab-${tab.id}`}
          onClick={() => setSelectedTabId(tab.id)}
        >
          {tab.id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('./content', () => ({
  PanelContent: () => <div data-test-subj="mockPanelContent" />,
}));

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

const nonAlertGetFieldsData = (field: string) => (field === 'event.kind' ? 'event' : undefined);

type RenderProps = Parameters<typeof LeftPanel>[0] & { contextOverrides?: Record<string, unknown> };

const renderLeftPanel = ({ contextOverrides = {}, ...props }: RenderProps = {}) =>
  render(
    <TestProvider>
      <DocumentDetailsContext.Provider value={{ ...mockContextValue, ...contextOverrides }}>
        <LeftPanel {...props} />
      </DocumentDetailsContext.Provider>
    </TestProvider>
  );

const getTabIds = (container: HTMLElement): string[] => {
  const raw = container
    .querySelector('[data-test-subj="mockPanelHeader"]')!
    .getAttribute('data-tab-ids')!;
  return raw.split(',');
};

const getSelectedTabId = (container: HTMLElement): string =>
  container.querySelector('[data-test-subj="mockPanelHeader"]')!.getAttribute('data-selected-tab')!;

describe('<LeftPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: false } });
  });

  // ---------------------------------------------------------------------------
  // Tab composition — alert document
  // ---------------------------------------------------------------------------
  describe('tab composition for alert documents', () => {
    it('should show visualize, insights, investigation and response tabs for a local alert', () => {
      const tabIds = getTabIds(renderLeftPanel().container);

      expect(tabIds).toEqual(['visualize', 'insights', 'investigation', 'response']);
    });

    it('should show visualize and insights tabs only for a remote alert (no investigation, no response)', () => {
      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { indexName: 'remote-cluster:index-name' } }).container
      );

      expect(tabIds).toEqual(['visualize', 'insights']);
    });

    it('should include the notes tab for a local alert when the user can read notes', () => {
      mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: true } });

      const tabIds = getTabIds(renderLeftPanel().container);

      expect(tabIds).toContain('notes');
    });

    it('should include the notes tab for a remote alert when the user can read notes', () => {
      mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: true } });

      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { indexName: 'remote-cluster:index-name' } }).container
      );

      expect(tabIds).toContain('notes');
      expect(tabIds).not.toContain('investigation');
      expect(tabIds).not.toContain('response');
    });

    it('should not include the notes tab when the user cannot read notes', () => {
      mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: false } });

      const tabIds = getTabIds(renderLeftPanel().container);

      expect(tabIds).not.toContain('notes');
    });
  });

  // ---------------------------------------------------------------------------
  // Tab composition — non-alert document
  // ---------------------------------------------------------------------------
  describe('tab composition for non-alert documents', () => {
    it('should show visualize and insights tabs only', () => {
      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { getFieldsData: nonAlertGetFieldsData } }).container
      );

      expect(tabIds).toEqual(['visualize', 'insights']);
    });

    it('should include the notes tab when the user can read notes', () => {
      mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: true } });

      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { getFieldsData: nonAlertGetFieldsData } }).container
      );

      expect(tabIds).toContain('notes');
      expect(tabIds).not.toContain('response');
    });
  });

  // ---------------------------------------------------------------------------
  // Rule preview mode
  // ---------------------------------------------------------------------------
  describe('rule preview mode', () => {
    it('should not show the visualize tab in rule preview', () => {
      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { isRulePreview: true } }).container
      );

      expect(tabIds).not.toContain('visualize');
    });

    it('should not show the notes tab in rule preview even when the user can read notes', () => {
      mockUseUserPrivileges.mockReturnValue({ notesPrivileges: { read: true } });

      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { isRulePreview: true } }).container
      );

      expect(tabIds).not.toContain('notes');
    });

    it('should show insights, investigation and response tabs in rule preview for an alert', () => {
      const tabIds = getTabIds(
        renderLeftPanel({ contextOverrides: { isRulePreview: true } }).container
      );

      expect(tabIds).toEqual(['insights', 'investigation', 'response']);
    });
  });

  // ---------------------------------------------------------------------------
  // Selected tab
  // ---------------------------------------------------------------------------
  describe('selected tab', () => {
    it('should default to the first tab when no path is provided', () => {
      const selectedTabId = getSelectedTabId(renderLeftPanel().container);

      expect(selectedTabId).toBe('visualize');
    });

    it('should select the tab matching path.tab', () => {
      const selectedTabId = getSelectedTabId(
        renderLeftPanel({ path: { tab: 'response' } }).container
      );

      expect(selectedTabId).toBe('response');
    });
  });

  // ---------------------------------------------------------------------------
  // Tab click — openLeftPanel + telemetry
  // ---------------------------------------------------------------------------
  describe('tab click interactions', () => {
    it('should call openLeftPanel with the correct params when a tab is clicked', () => {
      const { getByTestId } = renderLeftPanel();

      fireEvent.click(getByTestId('tab-response'));

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: 'document-details-left',
        path: { tab: 'response' },
        params: {
          id: mockContextValue.eventId,
          indexName: mockContextValue.indexName,
          scopeId: mockContextValue.scopeId,
        },
      });
    });

    it('should report a telemetry event when a tab is clicked', () => {
      const { getByTestId } = renderLeftPanel();

      fireEvent.click(getByTestId('tab-response'));

      expect(mockReportEvent).toHaveBeenCalledWith(
        DocumentEventTypes.DetailsFlyoutTabClicked,
        expect.objectContaining({
          location: mockContextValue.scopeId,
          panel: 'left',
          tabId: 'response',
        })
      );
    });
  });
});
