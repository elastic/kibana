/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Redirect, type RouteComponentProps } from 'react-router-dom';
import { useSearchParams } from '@kbn/shared-ux-router';

import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';

import { AttackDiscoveryRoutes } from './routes';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { useSpaceId } from '../common/hooks/use_space_id';
import { useIdsFromUrl } from './pages/results/history/use_ids_from_url';
import { buildAttackDetailPath } from '../../common/utils/attack_detail_path';
import { ATTACKS_PATH } from '../../common/constants';

jest.mock('react-router-dom', () => ({
  Redirect: jest.fn(() => <div data-test-subj="mock-redirect" />),
}));

jest.mock('@kbn/shared-ux-router', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockAlignmentEnabled = (enabled: boolean) => {
  (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
    (feature: string) => feature === 'enableAlertsAndAttacksAlignment' && enabled
  );
};

jest.mock('../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

jest.mock('./pages/results/history/use_ids_from_url', () => ({
  useIdsFromUrl: jest.fn(),
}));

jest.mock('../../common/utils/attack_detail_path', () => ({
  buildAttackDetailPath: jest.fn(),
}));

jest.mock('./pages', () => ({
  AttackDiscoveryPage: () => <div data-test-subj="mock-attack-discovery-page" />,
}));

jest.mock('../common/components/plugin_template_wrapper', () => ({
  PluginTemplateWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-plugin-template-wrapper">{children}</div>
  ),
}));

jest.mock('../common/components/security_route_page_wrapper', () => ({
  SecurityRoutePageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-security-route-page-wrapper">{children}</div>
  ),
}));

describe('AttackDiscoveryRoutes', () => {
  const mockSearchParams = new URLSearchParams();
  const mockRouteProps = {} as RouteComponentProps;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue([mockSearchParams]);
    (useSpaceId as jest.Mock).mockReturnValue('default');
    (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: [] });
  });

  it('renders the legacy AttackDiscoveryPage when alignment is disabled', () => {
    mockAlignmentEnabled(false);

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it('redirects to the Attacks page when alignment is enabled and the URL has no attack id', () => {
    mockAlignmentEnabled(true);

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(Redirect).toHaveBeenCalledTimes(1);
    expect((Redirect as jest.Mock).mock.calls[0][0]).toEqual({ to: ATTACKS_PATH });
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-attack-discovery-page')).not.toBeInTheDocument();
  });

  // Legacy `/attack_discovery?id=<id>` deep links (e.g. the generated `kibana.alert.url`) must
  // redirect to the new Attacks page with the attack flyout open when alignment is enabled.
  it('redirects to the attack flyout when alignment is enabled and the URL contains an attack id', () => {
    mockAlignmentEnabled(true);
    (useSpaceId as jest.Mock).mockReturnValue('default');
    (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: ['attack-id-1', 'attack-id-2'] });
    (buildAttackDetailPath as jest.Mock).mockReturnValue('/attacks/attack-id-1');

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(buildAttackDetailPath).toHaveBeenCalledWith({
      attackId: 'attack-id-1',
      index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default,${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`,
      timestamp: null,
    });
    expect(Redirect).toHaveBeenCalledTimes(1);
    expect((Redirect as jest.Mock).mock.calls[0][0]).toEqual({ to: '/attacks/attack-id-1' });
    expect(screen.queryByTestId('mock-attack-discovery-page')).not.toBeInTheDocument();
  });

  it('waits for the space id to resolve before redirecting', () => {
    mockAlignmentEnabled(true);
    (useSpaceId as jest.Mock).mockReturnValue(undefined);
    (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: ['attack-id-1'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(Redirect).not.toHaveBeenCalled();
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
  });

  it('does not redirect when alignment is disabled even if the URL contains an attack id', () => {
    mockAlignmentEnabled(false);
    (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: ['attack-id-1'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
  });
});
