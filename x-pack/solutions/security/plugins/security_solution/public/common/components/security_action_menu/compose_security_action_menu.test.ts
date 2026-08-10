/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeSecurityActionMenu } from './compose_security_action_menu';
import type { SecurityActionMenuPreset } from './types';

const PRESET: SecurityActionMenuPreset<string, 'workflow' | 'collaboration'> = {
  groups: [
    { id: 'workflow', actionIds: ['status', 'workflow'] },
    { id: 'collaboration', actionIds: ['cases', 'tags'] },
  ],
};

describe('composeSecurityActionMenu', () => {
  it('merges nested panels and closes only for direct actions', () => {
    const closeMenu = jest.fn();
    const directAction = jest.fn();
    const panelAction = jest.fn();
    const nestedAction = jest.fn();
    const result = composeSecurityActionMenu({
      preset: PRESET,
      closeMenu,
      contributions: [
        {
          id: 'status',
          items: [
            { name: 'Direct', onClick: directAction },
            { name: 'Panel', panel: 'statusPanel', onClick: panelAction },
          ],
          panels: [
            {
              id: 'statusPanel',
              title: 'Status',
              items: [{ name: 'Nested direct action', onClick: nestedAction }],
            },
          ],
        },
      ],
    });

    result.items[0].onClick?.({} as never);
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(directAction).toHaveBeenCalledTimes(1);

    result.items[1].onClick?.({} as never);
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(panelAction).toHaveBeenCalledTimes(1);
    expect(result.panels.map(({ id }) => id)).toEqual([0, 'statusPanel']);

    const nestedItem = result.panels[1].items?.[0] as {
      onClick?: (event: never) => void;
    };
    nestedItem.onClick?.({} as never);
    expect(closeMenu).toHaveBeenCalledTimes(2);
    expect(nestedAction).toHaveBeenCalledTimes(1);
  });

  it('adds separators only between non-empty groups', () => {
    const result = composeSecurityActionMenu({
      preset: PRESET,
      contributions: [
        { id: 'tags', items: [{ name: 'Tags' }] },
        { id: 'status', items: [{ name: 'Status' }] },
        { id: 'workflow', items: [] },
        { id: 'cases', items: [{ name: 'Cases' }] },
      ],
    });

    expect(result.items).toEqual([
      expect.objectContaining({ name: 'Status' }),
      expect.objectContaining({ isSeparator: true }),
      expect.objectContaining({ name: 'Cases' }),
      expect.objectContaining({ name: 'Tags' }),
    ]);
  });

  it('groups placed custom actions with their target and appends unassigned extensions', () => {
    const result = composeSecurityActionMenu({
      preset: PRESET,
      contributions: [
        { id: 'status', items: [{ name: 'Status' }] },
        { id: 'cases', items: [{ name: 'Cases' }] },
      ],
      customActions: [
        {
          id: 'customWorkflow',
          items: [{ name: 'Custom workflow' }],
          placement: { before: 'cases' },
        },
        { id: 'extension', items: [{ name: 'Extension' }] },
      ],
    });

    expect(result.items.map((item) => ('isSeparator' in item ? 'separator' : item.name))).toEqual([
      'Status',
      'separator',
      'Custom workflow',
      'Cases',
      'separator',
      'Extension',
    ]);
  });

  it('rejects duplicate child panel ids', () => {
    expect(() =>
      composeSecurityActionMenu({
        contributions: [
          { id: 'first', items: [], panels: [{ id: 'duplicate' }] },
          { id: 'second', items: [], panels: [{ id: 'duplicate' }] },
        ],
      })
    ).toThrow('contributed more than once');
  });
});
