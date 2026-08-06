/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeSecurityActionMenu } from './compose_security_action_menu';

describe('composeSecurityActionMenu', () => {
  it('merges nested panels and closes only for direct actions', () => {
    const closeMenu = jest.fn();
    const directAction = jest.fn();
    const panelAction = jest.fn();
    const nestedAction = jest.fn();
    const result = composeSecurityActionMenu({
      preset: 'alertRow',
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
});
