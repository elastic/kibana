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
import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';

import { AttackDiscoveryRoutes } from './routes';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';
import { useSpaceId } from '../common/hooks/use_space_id';
import { useIdsFromUrl } from './pages/results/history/use_ids_from_url';
import { buildAttackDetailPath } from '../../common/utils/attack_detail_path';
import { ATTACKS_PATH } from '../../common/constants';

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
  });

  describe('when enableAlertsAndAttacksAlignment is false', () => {
    beforeEach(() => {
      (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(false);
      (useSpaceId as jest.Mock).mockReturnValue('default');
      (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: [] });
    });

    it('renders the legacy AttackDiscoveryPage', () => {
      render(<AttackDiscoveryRoutes {...mockRouteProps} />);
      expect(screen.getByTestId('mock-attack-discovery-page')).toBeInTheDocument();
      expect(Redirect).not.toHaveBeenCalled();
    });
  });

  describe('when enableAlertsAndAttacksAlignment is true', () => {
    beforeEach(() => {
      (useIsAlertsAndAttacksAlignmentEnabled as jest.Mock).mockReturnValue(true);
    });

    describe('when there are no ids in the URL', () => {
      beforeEach(() => {
        (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: [] });
        (useSpaceId as jest.Mock).mockReturnValue('default');
      });

      it('redirects to the main attacks page', () => {
        render(<AttackDiscoveryRoutes {...mockRouteProps} />);
        expect(Redirect).toHaveBeenCalledWith({ to: ATTACKS_PATH }, {});
      });
    });

    describe('when there are ids in the URL', () => {
      beforeEach(() => {
        (useIdsFromUrl as jest.Mock).mockReturnValue({ ids: ['attack-id-1', 'attack-id-2'] });
      });

      describe('when spaceId is undefined', () => {
        beforeEach(() => {
          (useSpaceId as jest.Mock).mockReturnValue(undefined);
        });

        it('returns null and waits for spaceId to resolve', () => {
          const { container } = render(<AttackDiscoveryRoutes {...mockRouteProps} />);
          expect(container).toBeEmptyDOMElement();
          expect(Redirect).not.toHaveBeenCalled();
        });
      });

      describe('when spaceId is resolved', () => {
        const mockTimestamp = '2026-07-03T12:00:00.000Z';
        const expectedIndex = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-custom-space,${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-custom-space`;
        const expectedPath = '/mock-attack-detail-path';

        beforeEach(() => {
          (useSpaceId as jest.Mock).mockReturnValue('custom-space');
          const searchParams = new URLSearchParams();
          searchParams.set('timestamp', mockTimestamp);
          (useSearchParams as jest.Mock).mockReturnValue([searchParams]);
          (buildAttackDetailPath as jest.Mock).mockReturnValue(expectedPath);
        });

        it('redirects to the attack detail flyout for the first id with the correct index and timestamp', () => {
          render(<AttackDiscoveryRoutes {...mockRouteProps} />);

          expect(buildAttackDetailPath).toHaveBeenCalledWith({
            attackId: 'attack-id-1',
            index: expectedIndex,
            timestamp: mockTimestamp,
          });

          expect(Redirect).toHaveBeenCalledWith({ to: expectedPath }, {});
        });
      });
    });
  });
});
