/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { getEmptyValue } from '../../../../common/components/empty_value';
import {
  autonomousSystemRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from './field_renderers';
import { mockData } from '../details/mock';
import type { AutonomousSystem } from '../../../../../common/search_strategy';
import { FlowTarget } from '../../../../../common/search_strategy';
import type { HostEcs } from '@kbn/securitysolution-ecs';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';
import { PageScope } from '../../../../data_view_manager/constants';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/security-solution-navigation/src/context');
mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
    `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`
);

const mockHost: HostEcs = mockData.complete.host as HostEcs;

describe('Field Renderers', () => {
  const scopeId = PageScope.default;

  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        locationRenderer(
          ['source.geo.city_name', 'source.geo.region_name'],
          mockData.complete,
          scopeId
        ),
        { wrapper: TestProviders }
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when no fields provided', () => {
      render(<TestProviders>{locationRenderer([], mockData.complete, scopeId)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      render(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete, scopeId)}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#autonomousSystemRenderer', () => {
    const emptyMock: AutonomousSystem = { organization: { name: null }, number: null };
    const halfEmptyMock: AutonomousSystem = { organization: { name: 'Test Org' }, number: null };

    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        autonomousSystemRenderer(
          mockData.complete.source!.autonomousSystem!,
          FlowTarget.source,
          scopeId
        ),
        { wrapper: TestProviders }
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      render(
        <TestProviders>
          {autonomousSystemRenderer(halfEmptyMock, FlowTarget.source, scopeId)}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      render(
        <TestProviders>
          {autonomousSystemRenderer(emptyMock, FlowTarget.source, scopeId)}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  const emptyIdHost: Partial<HostEcs> = {
    name: ['test'],
    id: undefined,
    ip: ['10.10.10.10'],
  };
  const emptyIpHost: Partial<HostEcs> = {
    name: ['test'],
    id: ['test'],
    ip: undefined,
  };
  const emptyNameHost: Partial<HostEcs> = {
    name: undefined,
    id: ['test'],
    ip: ['10.10.10.10'],
  };

  describe('#hostIdRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>
          {hostIdRenderer({
            scopeId,
            host: mockHost,
            ipFilter: '10.10.10.10',
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>
          {hostIdRenderer({
            scopeId,
            host: mockHost,
            ipFilter: '10.10.10.11',
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      render(
        <TestProviders>
          {hostIdRenderer({
            scopeId,
            host: emptyIdHost,
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(
        <TestProviders>
          {hostIdRenderer({
            scopeId,
            host: emptyIpHost,
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders multiple host ids', () => {
      render(
        <TestProviders>
          {hostIdRenderer({
            scopeId,
            host: { ...emptyIdHost, id: ['test1', 'test2'] },
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText('test1')).toBeInTheDocument();
      expect(screen.getByText('+1 More')).toBeInTheDocument();
    });
  });

  describe('#hostNameRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>
          {hostNameRenderer({
            scopeId,
            host: mockHost,
            ipFilter: '10.10.10.10',
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>
          {hostNameRenderer({
            scopeId,
            host: mockHost,
            ipFilter: '10.10.10.11',
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(
        <TestProviders>
          {hostNameRenderer({
            scopeId,
            host: emptyIpHost,
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      render(
        <TestProviders>
          {hostNameRenderer({
            scopeId,
            host: emptyNameHost,
            isFlyoutOpen: false,
          })}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#whoisRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(whoisRenderer('10.10.10.10'));

      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('#reputationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>{reputationRenderer('10.10.10.10')}</TestProviders>
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });
});
