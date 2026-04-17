/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ATTACK_PREVIEW_BANNER, AttackDetailsPreviewPanel, AttackDetailsRightPanel } from '.';
import { AttackDetailsPreviewPanelKey, AttackDetailsRightPanelKey } from './constants/panel_keys';
import { useAttackDetailsContext } from './context';
import { useTabs } from './hooks/use_tabs';
import { useNavigateToAttackDetailsLeftPanel } from './hooks/use_navigate_to_attack_details_left_panel';
import { useKibana } from '../../common/lib/kibana';

const mockFlyoutNavigation = jest.fn((props: unknown) => (
  <div data-test-subj="flyoutNavigation">{JSON.stringify(props)}</div>
));

jest.mock('@kbn/expandable-flyout');
jest.mock('./context');
jest.mock('./hooks/use_tabs');
jest.mock('./hooks/use_navigate_to_attack_details_left_panel');
jest.mock('../../common/lib/kibana');
jest.mock('./content', () => ({ PanelContent: () => <div data-test-subj="panelContent" /> }));
jest.mock('./footer', () => ({ PanelFooter: () => <div data-test-subj="panelFooter" /> }));
jest.mock('../shared/components/flyout_navigation', () => ({
  FlyoutNavigation: (props: unknown) => mockFlyoutNavigation(props),
}));
jest.mock('./header', () => ({
  PanelHeader: ({
    setSelectedTabId,
  }: {
    setSelectedTabId: (tab: 'overview' | 'table' | 'json') => void;
  }) => (
    <button
      type="button"
      data-test-subj="switchTabButton"
      onClick={() => setSelectedTabId('table')}
    >
      {'switch tab'}
    </button>
  ),
}));

describe('AttackDetailsPanel', () => {
  const openRightPanel = jest.fn();
  const openPreviewPanel = jest.fn();
  const setStorage = jest.fn();

  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      openRightPanel,
      openPreviewPanel,
      openFlyout: jest.fn(),
      openLeftPanel: jest.fn(),
      closeRightPanel: jest.fn(),
      closeLeftPanel: jest.fn(),
      closePreviewPanel: jest.fn(),
      previousPreviewPanel: jest.fn(),
      closeFlyout: jest.fn(),
    });
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: false,
      getFieldsData: jest.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);
    jest.mocked(useTabs).mockReturnValue({
      tabsDisplayed: [],
      selectedTabId: 'overview',
    });
    jest.mocked(useNavigateToAttackDetailsLeftPanel).mockReturnValue(jest.fn());
    jest.mocked(useKibana).mockReturnValue({
      services: {
        storage: {
          set: setStorage,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
    openRightPanel.mockReset();
    openPreviewPanel.mockReset();
    setStorage.mockReset();
    mockFlyoutNavigation.mockClear();
  });

  it('uses right-panel navigation in right panel', () => {
    const { getByTestId } = render(<AttackDetailsRightPanel />);
    getByTestId('switchTabButton').click();

    expect(mockFlyoutNavigation.mock.calls[0][0]).toEqual(
      expect.objectContaining({ flyoutIsExpandable: true })
    );
    expect(openRightPanel).toHaveBeenCalledWith({
      id: AttackDetailsRightPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
      },
    });
    expect(openPreviewPanel).not.toHaveBeenCalled();
  });

  it('uses preview navigation when rendered in preview panel', () => {
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: true,
      getFieldsData: jest.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);

    const { getByTestId } = render(<AttackDetailsPreviewPanel />);
    getByTestId('switchTabButton').click();
    expect(mockFlyoutNavigation).not.toHaveBeenCalled();

    expect(openPreviewPanel).toHaveBeenCalledWith({
      id: AttackDetailsPreviewPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
        banner: ATTACK_PREVIEW_BANNER,
      },
    });
    expect(openRightPanel).not.toHaveBeenCalled();
  });

  it('uses default preview banner', () => {
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: true,
      getFieldsData: jest.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);

    const { getByTestId } = render(<AttackDetailsPreviewPanel />);
    getByTestId('switchTabButton').click();

    expect(openPreviewPanel).toHaveBeenCalledWith({
      id: AttackDetailsPreviewPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
        banner: ATTACK_PREVIEW_BANNER,
      },
    });
  });
});
