/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Redirect, type RouteComponentProps } from 'react-router-dom';
import { useSearchParams } from '@kbn/shared-ux-router';

import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';

import { AttackDiscoveryRoutes } from './routes';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';
import { useSpaceId } from '../common/hooks/use_space_id';
import { useIdsFromUrl } from './pages/results/history/use_ids_from_url';
import { buildAttackDetailPath } from '../../common/utils/attack_detail_path';

vi.mock('react-router-dom', () => {
  const mocked = {
    Redirect: vi.fn(() => <div data-test-subj="mock-redirect" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/shared-ux-router', () => {
  const mocked = {
    useSearchParams: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/hooks/use_is_alerts_and_attacks_alignment_enabled', () => {
  const mocked = {
    useIsAlertsAndAttacksAlignmentEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./pages/results/history/use_ids_from_url', () => {
  const mocked = {
    useIdsFromUrl: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/utils/attack_detail_path', () => {
  const mocked = {
    buildAttackDetailPath: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./pages', () => {
  const mocked = {
    AttackDiscoveryPage: () => <div data-test-subj="mock-attack-discovery-page" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./pages/attack_discovery_moved', () => {
  const mocked = {
    AttackDiscoveryMovedPage: () => <div data-test-subj="mock-attack-discovery-moved-page" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/components/plugin_template_wrapper', () => {
  const mocked = {
    PluginTemplateWrapper: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="mock-plugin-template-wrapper">{children}</div>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../common/components/security_route_page_wrapper', () => {
  const mocked = {
    SecurityRoutePageWrapper: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="mock-security-route-page-wrapper">{children}</div>
    ),
  };
  return { ...mocked, default: mocked };
});

describe('AttackDiscoveryRoutes', () => {
  const mockSearchParams = new URLSearchParams();
  const mockRouteProps = {} as RouteComponentProps;

  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchParams as Mock).mockReturnValue([mockSearchParams]);
    (useSpaceId as Mock).mockReturnValue('default');
    (useIdsFromUrl as Mock).mockReturnValue({ ids: [] });
  });

  it('renders the legacy AttackDiscoveryPage when alignment is disabled', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(false);

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-attack-discovery-moved-page')).not.toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('renders the AttackDiscoveryMovedPage when alignment is enabled', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(true);

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-moved-page')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-attack-discovery-page')).not.toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
  });

  // Legacy `/attack_discovery?id=<id>` deep links (e.g. the generated `kibana.alert.url`) must
  // redirect to the new Attacks page with the attack flyout open when alignment is enabled.
  it('redirects to the attack flyout when alignment is enabled and the URL contains an attack id', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(true);
    (useSpaceId as Mock).mockReturnValue('default');
    (useIdsFromUrl as Mock).mockReturnValue({ ids: ['attack-id-1', 'attack-id-2'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(buildAttackDetailPath).toHaveBeenCalledWith({
      attackId: 'attack-id-1',
      index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default,${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`,
      timestamp: null,
    });
    expect(Redirect).toHaveBeenCalled();
    expect(screen.queryByTestId('mock-attack-discovery-moved-page')).not.toBeInTheDocument();
  });

  it('waits for the space id to resolve before redirecting', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(true);
    (useSpaceId as Mock).mockReturnValue(undefined);
    (useIdsFromUrl as Mock).mockReturnValue({ ids: ['attack-id-1'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(Redirect).not.toHaveBeenCalled();
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
  });

  it('does not redirect when alignment is disabled even if the URL contains an attack id', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(false);
    (useIdsFromUrl as Mock).mockReturnValue({ ids: ['attack-id-1'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
  });
});
