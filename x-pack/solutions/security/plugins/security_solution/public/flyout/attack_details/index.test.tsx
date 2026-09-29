/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { ATTACK_PREVIEW_BANNER, AttackDetailsPreviewPanel, AttackDetailsRightPanel } from '.';
import { AttackDetailsPreviewPanelKey, AttackDetailsRightPanelKey } from './constants/panel_keys';
import { useAttackDetailsContext } from './context';
import { useTabs } from '../../flyout_v2/shared/hooks/use_tabs';
import { useNavigateToAttackDetailsLeftPanel } from './hooks/use_navigate_to_attack_details_left_panel';
import { useKibana } from '../../common/lib/kibana';

const mockFlyoutNavigation = vi.fn((_props?: unknown) => (
  <div data-test-subj="flyoutNavigation" />
));

vi.mock('@kbn/expandable-flyout');
vi.mock('./context');
vi.mock('../../flyout_v2/shared/hooks/use_tabs');
vi.mock('./hooks/use_navigate_to_attack_details_left_panel');
vi.mock('../../common/lib/kibana');
vi.mock('./content', () => {
      const mocked = { PanelContent: () => <div data-test-subj="panelContent" /> };
      return { ...mocked, default: mocked };
    });
vi.mock('./footer', () => {
      const mocked = { PanelFooter: () => <div data-test-subj="panelFooter" /> };
      return { ...mocked, default: mocked };
    });
vi.mock('../shared/components/flyout_navigation', () => {
      const mocked = {
      FlyoutNavigation: (props: unknown) => mockFlyoutNavigation(props),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/header_actions', () => {
      const mocked = {
      AttackHeaderActions: () => <span data-test-subj="attackHeaderActionsMock" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./header', () => {
      const mocked = {
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
    };
      return { ...mocked, default: mocked };
    });

describe('AttackDetailsPanel', () => {
  const openRightPanel = vi.fn();
  const openPreviewPanel = vi.fn();
  const setStorage = vi.fn();

  beforeEach(() => {
    vi.mocked(useExpandableFlyoutApi).mockReturnValue({
      openRightPanel,
      openPreviewPanel,
      openFlyout: vi.fn(),
      openLeftPanel: vi.fn(),
      closeRightPanel: vi.fn(),
      closeLeftPanel: vi.fn(),
      closePreviewPanel: vi.fn(),
      previousPreviewPanel: vi.fn(),
      closeFlyout: vi.fn(),
    });
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: false,
      getFieldsData: vi.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);
    vi.mocked(useTabs).mockReturnValue({
      selectedTabId: 'overview',
      setSelectedTabId: vi.fn(),
    });
    vi.mocked(useNavigateToAttackDetailsLeftPanel).mockReturnValue(vi.fn());
    vi.mocked(useKibana).mockReturnValue({
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
      expect.objectContaining({
        flyoutIsExpandable: true,
        actions: expect.any(Object),
      })
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
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: true,
      getFieldsData: vi.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: vi.fn(),
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

  it('shows the remote document callout when searchHit._index is a CCS remote index', () => {
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: 'remote-cluster:.alerts-security.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: false,
      getFieldsData: vi.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: {
        _id: 'attack-1',
        _index: 'remote-cluster:.alerts-security.alerts-default',
        _source: { [EVENT_KIND]: 'signal' },
      },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAttackDetailsContext>);

    const { getByText } = render(<AttackDetailsRightPanel />);

    expect(
      getByText('This alert originates from a remote cluster. Some features may not be available.')
    ).toBeInTheDocument();
  });

  it('uses default preview banner', () => {
    vi.mocked(useAttackDetailsContext).mockReturnValue({
      attackId: 'attack-1',
      indexName: '.alerts-security.attack.discovery.alerts-default',
      attack: null,
      scopeId: 'scope',
      isPreviewMode: true,
      getFieldsData: vi.fn(),
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _id: 'attack-1', _source: {} },
      refetch: vi.fn(),
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
