/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ATTACK_PREVIEW_BANNER, AttackDetailsPanel } from '.';
import { AttackDetailsRightPanelKey } from './constants/panel_keys';
import { useAttackDetailsContext } from './context';
import { useTabs } from './hooks/use_tabs';
import { useNavigateToAttackDetailsLeftPanel } from './hooks/use_navigate_to_attack_details_left_panel';
import { useKibana } from '../../common/lib/kibana';

jest.mock('@kbn/expandable-flyout');
jest.mock('./context');
jest.mock('./hooks/use_tabs');
jest.mock('./hooks/use_navigate_to_attack_details_left_panel');
jest.mock('../../common/lib/kibana');
jest.mock('./content', () => ({ PanelContent: () => <div data-test-subj="panelContent" /> }));
jest.mock('./footer', () => ({ PanelFooter: () => <div data-test-subj="panelFooter" /> }));
jest.mock('../shared/components/flyout_navigation', () => ({
  FlyoutNavigation: () => <div data-test-subj="flyoutNavigation" />,
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
  const customBanner = {
    title: 'Preview attack details',
    backgroundColor: 'warning',
    textColor: 'warning',
  };

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
      isPreviewMode: false,
      attack: null,
      scopeId: 'scope',
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
  });

  it('uses preview navigation when rendered in preview mode', () => {
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      isPreviewMode: true,
      banner: customBanner,
      attack: null,
      scopeId: 'scope',
      getFieldsData: jest.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);

    const { getByTestId } = render(<AttackDetailsPanel />);
    getByTestId('switchTabButton').click();

    expect(openPreviewPanel).toHaveBeenCalledWith({
      id: AttackDetailsRightPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
        isPreviewMode: true,
        banner: customBanner,
      },
    });
    expect(openRightPanel).not.toHaveBeenCalled();
  });

  it('uses default preview banner in preview mode when context banner is missing', () => {
    jest.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      isPreviewMode: true,
      banner: undefined,
      attack: null,
      scopeId: 'scope',
      getFieldsData: jest.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);

    const { getByTestId } = render(<AttackDetailsPanel />);
    getByTestId('switchTabButton').click();

    expect(openPreviewPanel).toHaveBeenCalledWith({
      id: AttackDetailsRightPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
        isPreviewMode: true,
        banner: ATTACK_PREVIEW_BANNER,
      },
    });
  });

  it('uses right-panel navigation outside preview mode', () => {
    const { getByTestId } = render(<AttackDetailsPanel />);
    getByTestId('switchTabButton').click();

    expect(openRightPanel).toHaveBeenCalledWith({
      id: AttackDetailsRightPanelKey,
      path: { tab: 'table' },
      params: {
        attackId: 'attack-1',
        indexName: '.alerts-security.attack.discovery.alerts-default',
        isPreviewMode: false,
      },
    });
    expect(openPreviewPanel).not.toHaveBeenCalled();
  });
});
