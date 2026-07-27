/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AttackDiscoveryRoutes } from './routes';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';

jest.mock('../common/hooks/use_is_alerts_and_attacks_alignment_enabled', () => ({
  useIsAlertsAndAttacksAlignmentEnabled: jest.fn(),
}));

jest.mock('./pages', () => ({
  AttackDiscoveryPage: () => <div data-test-subj="mock-attack-discovery-page" />,
}));

jest.mock('./pages/attack_discovery_moved', () => ({
  AttackDiscoveryMovedPage: () => <div data-test-subj="mock-attack-discovery-moved-page" />,
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when enableAlertsAndAttacksAlignment is false', () => {
    beforeEach(() => {
      (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(false);
    });

    it('renders the legacy AttackDiscoveryPage', () => {
      render(<AttackDiscoveryRoutes />);
      expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-attack-discovery-moved-page')).not.toBeInTheDocument();
    });
  });

  describe('when enableAlertsAndAttacksAlignment is true', () => {
    beforeEach(() => {
      (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(true);
    });

    it('renders the banner-only AttackDiscoveryMovedPage', () => {
      render(<AttackDiscoveryRoutes />);
      expect(screen.getByTestId('mock-attack-discovery-moved-page')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-attack-discovery-page')).not.toBeInTheDocument();
    });
  });
});
