/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { getEmptyValue } from '../../../common/components/empty_value';
import {
  autonomousSystemRenderer,
  hostNameRenderer,
  locationRenderer,
  whoisRenderer,
  reputationRenderer,
} from './field_renderers';
import { mockData } from '../../../explore/network/components/details/mock';
import type { AutonomousSystem } from '../../../../common/search_strategy';
import { FlowTarget } from '../../../../common/search_strategy';
import type { HostEcs } from '@kbn/securitysolution-ecs';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';
import { SourcererScopeName } from '../../../sourcerer/store/model';

jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/security-solution-navigation/src/context');
mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
    `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`
);

jest.mock('../../../common/hooks/use_get_field_spec');

describe('Field Renderers', () => {
  const scopeId = SourcererScopeName.default;

  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        locationRenderer(['source.geo.city_name', 'source.geo.region_name'], mockData.complete),
        { wrapper: TestProviders }
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when no fields provided', () => {
      render(<TestProviders>{locationRenderer([], mockData.complete)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      render(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete)}
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
        autonomousSystemRenderer(mockData.complete.source!.autonomousSystem!, FlowTarget.source),
        { wrapper: TestProviders }
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      render(
        <TestProviders>{autonomousSystemRenderer(halfEmptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      render(
        <TestProviders>{autonomousSystemRenderer(emptyMock, FlowTarget.source)}</TestProviders>
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
          {hostNameRenderer(scopeId, mockData.complete.host, '10.10.10.10')}
        </TestProviders>
      );
      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>
          {hostNameRenderer(scopeId, mockData.complete.host, '10.10.10.11')}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(scopeId, emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(scopeId, emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#hostNameRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>
          {hostNameRenderer(scopeId, mockData.complete.host, '10.10.10.10')}
        </TestProviders>
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>
          {hostNameRenderer(scopeId, mockData.complete.host, '10.10.10.11')}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(scopeId, emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(scopeId, emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(scopeId, emptyNameHost, FlowTarget.source)}</TestProviders>
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
