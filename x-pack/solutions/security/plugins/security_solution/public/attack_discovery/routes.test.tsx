/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Redirect, type RouteComponentProps } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';

import { AttackDiscoveryRoutes } from './routes';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';
import { useSpaceId } from '../common/hooks/use_space_id';
import { useIdsFromUrl } from './pages/results/history/use_ids_from_url';
import { buildAttackDetailPath } from '../../common/utils/attack_detail_path';

jest.mock('react-router-dom', () => ({
  Redirect: jest.fn(() => <div data-test-subj="mock-redirect" />),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('../common/hooks/use_is_alerts_and_attacks_alignment_enabled', () => ({
  useIsAlertsAndAttacksAlignmentEnabled: jest.fn(),
}));

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

  // The legacy `/attack_discovery` -> Attacks redirect is intentionally disabled
  // (see ENABLE_LEGACY_ATTACK_DISCOVERY_REDIRECT in routes.tsx). Attack Discovery is now a
  // permanent top-level page, so the route always renders the page and never redirects,
  // regardless of the alerts-and-attacks alignment setting.
  it.each([false, true])(
    'renders the AttackDiscoveryPage without redirecting when alignment enabled = %s',
    (alignmentEnabled) => {
      (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(alignmentEnabled);

      render(<AttackDiscoveryRoutes {...mockRouteProps} />);

      expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
      expect(Redirect).not.toHaveBeenCalled();
    }
  );

  it('does not redirect even when the URL contains attack ids', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(true);
    (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: ['attack-id-1', 'attack-id-2'] });

    render(<AttackDiscoveryRoutes {...mockRouteProps} />);

    expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
    expect(Redirect).not.toHaveBeenCalled();
    expect(buildAttackDetailPath).not.toHaveBeenCalled();
  });
});
