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
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { getMockAttackDiscoveryAlerts } from '../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useGetDefaultGroupTitleRenderers } from './use_get_default_group_title_renderers';
import { ATTACK_TITLE_TEST_ID_SUFFIX } from '../../components/attacks/table/attack_group_content';

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn(),
}));

jest.mock('../../../attack_discovery/pages/results/attack_discovery_markdown_formatter', () => ({
  AttackDiscoveryMarkdownFormatter: jest.fn(({ markdown }) => (
    <div data-test-subj="mock-markdown-formatter">{markdown}</div>
  )),
}));

const mockAttacks = getMockAttackDiscoveryAlerts();

describe('useGetDefaultGroupTitleRenderers', () => {
  beforeEach(() => {
    (useAssistantContext as jest.Mock).mockReturnValue({
      assistantAvailability: { isAssistantEnabled: true },
      http: {},
    });
  });

  it('should return a renderer that renders AttackGroupContent for ALERT_ATTACK_IDS', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: { data: mockAttacks },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({ attackIds: mockAttacks.map((a) => a.id) })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
    const rendered = renderer(ALERT_ATTACK_IDS, bucket);

    const { getByTestId } = render(rendered as React.ReactElement);
    expect(getByTestId(`attack${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toHaveTextContent(
      mockAttacks[0].title
    );
  });

  it('should return undefined if bucket key is an array with more than one element', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: { data: mockAttacks },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({ attackIds: mockAttacks.map((a) => a.id) })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: [mockAttacks[0].id, 'another-id'], doc_count: 2 };
    const rendered = renderer(ALERT_ATTACK_IDS, bucket);

    expect(rendered).toBeUndefined();
  });

  it('should return undefined for other group types', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: { data: mockAttacks },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({ attackIds: mockAttacks.map((a) => a.id) })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: 'some-key', doc_count: 1 };
    const rendered = renderer('some-other-group', bucket);

    expect(rendered).toBeUndefined();
  });

  it('should return undefined if attack is not found for a given bucket key', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: { data: mockAttacks },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({ attackIds: mockAttacks.map((a) => a.id) })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: ['non-existent-attack-id'], doc_count: 1 };
    const rendered = renderer(ALERT_ATTACK_IDS, bucket);

    expect(rendered).toBeUndefined();
  });

  it('should handle loading state', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useGetDefaultGroupTitleRenderers({ attackIds: mockAttacks.map((a) => a.id) })
    );

    const renderer = result.current.defaultGroupTitleRenderers;
    const bucket = { key: [mockAttacks[0].id], doc_count: 1 };
    const rendered = renderer(ALERT_ATTACK_IDS, bucket);

    const { queryByTestId } = render(rendered as React.ReactElement);
    expect(queryByTestId(`attack${ATTACK_TITLE_TEST_ID_SUFFIX}`)).toBeNull();
  });
});
