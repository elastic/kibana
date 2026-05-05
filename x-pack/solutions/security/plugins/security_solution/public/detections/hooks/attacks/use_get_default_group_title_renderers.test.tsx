/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { useAssistantContext } from '@kbn/elastic-assistant';

import { ALERT_ATTACK_IDS } from '../../../../common/field_maps/field_names';
import { getMockAttackDiscoveryAlerts } from '../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import {
  ATTACK_GROUP_LOADING_SPINNER_TEST_ID,
  useGetDefaultGroupTitleRenderers,
} from './use_get_default_group_title_renderers';
import {
  ATTACK_TITLE_TEST_ID_SUFFIX,
  EXPAND_ATTACK_BUTTON_TEST_ID,
} from '../../components/attacks/table/attack_group_content';

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('../../../attack_discovery/pages/results/attack_discovery_markdown_formatter', () => ({
  AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }) => (
    <div data-test-subj="mock-markdown-formatter">{markdown}</div>
  )),
}));

jest.mock(
  '../../../attack_discovery/pages/loading_callout/loading_messages/get_formatted_time',
  () => ({
    getFormattedDate: jest.fn(() => '2023-10-27 10:00:00'),
  })
);

jest.mock('../../../common/lib/kibana', () => ({
  useDateFormat: jest.fn(() => jest.fn()),
}));

const mockAttacks = getMockAttackDiscoveryAlerts();

describe('useGetDefaultGroupTitleRenderers', () => {
  const mockGetAttack = jest.fn();

  beforeEach(() => {
    (useAssistantContext as jest.Mock).mockReturnValue({
      assistantAvailability: { isAssistantEnabled: true },
      http: {},
    });
    mockGetAttack.mockReset();
  });

  it('should return a renderer that renders AttackGroupContent when getAttack returns an attack', () => {
    mockGetAttack.mockReturnValue(mockAttacks[0]);

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({
        getAttack: mockGetAttack,
        openAttackDetailsFlyout: jest.fn(),
      })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
    const rendered = renderer(ALERT_ATTACK_IDS, bucket);

    expect(mockGetAttack).toHaveBeenCalledWith(ALERT_ATTACK_IDS, bucket);

    const { getByTestId } = render(rendered as React.ReactElement);
    expect(getByTestId(`attack${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      mockAttacks[0].title
    );
  });

  it('should return undefined when getAttack returns undefined', () => {
    mockGetAttack.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({
        getAttack: mockGetAttack,
        openAttackDetailsFlyout: jest.fn(),
      })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: ['some-key'], doc_count: 1 };
    const rendered = renderer('some-group', bucket);

    expect(mockGetAttack).toHaveBeenCalledWith('some-group', bucket);
    expect(rendered).toBeUndefined();
  });

  describe('showAnonymized prop', () => {
    it('should pass showAnonymized=true to AttackGroupContent when provided', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);

      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          showAnonymized: true,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { container } = render(rendered as React.ReactElement);
      // Verify the component is rendered (AttackGroupContent will handle the showAnonymized prop)
      expect(
        container.querySelector(`[data-test-subj="attack${ATTACK_TITLE_TEST_ID_SUFFIX}"]`)
      ).toBeInTheDocument();
    });

    it('should pass showAnonymized=false to AttackGroupContent when explicitly set to false', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);

      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          showAnonymized: false,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { container } = render(rendered as React.ReactElement);
      expect(
        container.querySelector(`[data-test-subj="attack${ATTACK_TITLE_TEST_ID_SUFFIX}"]`)
      ).toBeInTheDocument();
    });

    it('should default to showAnonymized=undefined when not provided', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);

      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { container } = render(rendered as React.ReactElement);
      expect(
        container.querySelector(`[data-test-subj="attack${ATTACK_TITLE_TEST_ID_SUFFIX}"]`)
      ).toBeInTheDocument();
    });
  });

  describe('isLoading prop', () => {
    it('should render a loading spinner when isLoading is true and group is ALERT_ATTACK_IDS', () => {
      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          isLoading: true,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: ['some-key'], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { getByTestId } = render(rendered as React.ReactElement);
      expect(getByTestId(ATTACK_GROUP_LOADING_SPINNER_TEST_ID)).toBeInTheDocument();
    });

    it('should render content normally when isLoading is false', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);
      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          isLoading: false,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { getByTestId } = render(rendered as React.ReactElement);
      expect(getByTestId(`attack${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toBeInTheDocument();
    });

    it('should render a loading spinner when isLoading is true even if attack is present', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);

      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          isLoading: true,
          openAttackDetailsFlyout: jest.fn(),
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      const { getByTestId } = render(rendered as React.ReactElement);
      expect(getByTestId(ATTACK_GROUP_LOADING_SPINNER_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('openAttackDetailsFlyout prop', () => {
    it('should be called when the attack title button is clicked', () => {
      mockGetAttack.mockReturnValue(mockAttacks[0]);
      const openAttackDetailsFlyout = jest.fn();

      const { result } = renderHook(() =>
        useGetDefaultGroupTitleRenderers({
          getAttack: mockGetAttack,
          openAttackDetailsFlyout,
        })
      );

      const renderer = result.current.defaultGroupTitleRenderers;
      const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
      const rendered = renderer(ALERT_ATTACK_IDS, bucket);

      // We need to render the output to simulate the click on the AttackGroupContent
      const { getByTestId } = render(rendered as React.ReactElement);

      // The button ID is defined in attack_group_content/index.tsx
      const button = getByTestId(EXPAND_ATTACK_BUTTON_TEST_ID);
      button.click();

      expect(openAttackDetailsFlyout).toHaveBeenCalledWith(ALERT_ATTACK_IDS, bucket);
    });
  });
});
