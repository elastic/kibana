/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case',
  () => ({
    useAddToExistingCase: jest.fn(),
  })
);
jest.mock('../../../../../attack_discovery/pages/results/take_action/use_add_to_case', () => ({
  useAddToNewCase: jest.fn(),
}));
jest.mock('@kbn/elastic-assistant-common', () => ({
  getAttackDiscoveryMarkdown: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAttackCaseContextMenuItems } = require('./use_attack_case_context_menu_items') as {
  useAttackCaseContextMenuItems: (props: { attack: unknown; closePopover?: () => void }) => {
    items: EuiContextMenuPanelItemDescriptorEntry[];
  };
};

const { useKibana } = jest.requireMock('../../../../../common/lib/kibana') as {
  useKibana: jest.Mock;
};
const { useAddToExistingCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_existing_case'
) as { useAddToExistingCase: jest.Mock };
const { useAddToNewCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_case'
) as { useAddToNewCase: jest.Mock };
const { getAttackDiscoveryMarkdown } = jest.requireMock('@kbn/elastic-assistant-common') as {
  getAttackDiscoveryMarkdown: jest.Mock;
};

const mockUseKibana = useKibana as jest.Mock;
const mockUseAddToNewCase = useAddToNewCase as jest.Mock;
const mockUseAddToExistingCase = useAddToExistingCase as jest.Mock;
const mockGetAttackDiscoveryMarkdown = getAttackDiscoveryMarkdown as jest.Mock;

describe('useAttackCaseContextMenuItems', () => {
  const closePopover = jest.fn();
  const mockAttack = getMockAttackDiscoveryAlerts()[0];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              createComment: true,
              read: true,
            }),
          },
        },
      },
    });

    mockGetAttackDiscoveryMarkdown.mockReturnValue('mock-markdown');

    mockUseAddToNewCase.mockReturnValue({
      disabled: false,
      onAddToNewCase: jest.fn(),
    });

    mockUseAddToExistingCase.mockReturnValue({
      disabled: false,
      onAddToExistingCase: jest.fn(),
    });
  });

  it('should return two items matching the snapshot when user has permissions', () => {
    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({ attack: mockAttack, closePopover })
    );

    expect(result.current.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "attack-add-to-new-case",
          "disabled": false,
          "key": "attack-add-to-new-case",
          "name": "Add to new case",
          "onClick": [Function],
        },
        Object {
          "data-test-subj": "attack-add-to-existing-case",
          "disabled": false,
          "key": "attack-add-to-existing-case",
          "name": "Add to existing case",
          "onClick": [Function],
        },
      ]
    `);
  });

  it('should return no items when user lacks permissions', () => {
    mockUseKibana.mockReturnValue({
      services: {
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              createComment: false,
              read: true,
            }),
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({ attack: mockAttack, closePopover })
    );

    expect(result.current.items).toEqual([]);
  });

  it('should call `closePopover` and `onAddToNewCase` on click', () => {
    const onAddToNewCase = jest.fn();
    mockUseAddToNewCase.mockReturnValue({
      disabled: false,
      onAddToNewCase,
    });

    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({ attack: mockAttack, closePopover })
    );

    result.current.items[0]?.onClick?.({} as React.MouseEvent);

    expect(closePopover).toHaveBeenCalledTimes(1);
    expect(onAddToNewCase).toHaveBeenCalledWith({
      alertIds: mockAttack.alertIds,
      replacements: mockAttack.replacements,
      markdownComments: ['mock-markdown'],
    });
  });

  it('should call `closePopover` and `onAddToExistingCase` on click', () => {
    const onAddToExistingCase = jest.fn();
    mockUseAddToExistingCase.mockReturnValue({
      disabled: false,
      onAddToExistingCase,
    });

    const { result } = renderHook(() =>
      useAttackCaseContextMenuItems({ attack: mockAttack, closePopover })
    );

    result.current.items[1]?.onClick?.({} as React.MouseEvent);

    expect(closePopover).toHaveBeenCalledTimes(1);
    expect(onAddToExistingCase).toHaveBeenCalledWith({
      alertIds: mockAttack.alertIds,
      replacements: mockAttack.replacements,
      markdownComments: ['mock-markdown'],
    });
  });

  it('should build markdown using the attack + replacements', () => {
    renderHook(() => useAttackCaseContextMenuItems({ attack: mockAttack, closePopover }));

    expect(mockGetAttackDiscoveryMarkdown).toHaveBeenCalledWith({
      attackDiscovery: mockAttack,
      replacements: mockAttack.replacements,
    });
  });
});
