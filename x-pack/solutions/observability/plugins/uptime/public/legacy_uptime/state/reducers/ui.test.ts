/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setBasePath,
  toggleIntegrationsPopover,
  setAlertFlyoutVisible,
  setSearchTextAction,
} from '../actions';
import { uiReducer } from './ui';
import { Action } from 'redux-actions';

describe('ui reducer', () => {
  it(`sets the application's base path`, () => {
    const action = setBasePath('yyz') as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: 'abc',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          monitorId: 'test',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": false,
        "basePath": "yyz",
        "esKuery": "",
        "integrationsPopoverOpen": null,
        "monitorId": "test",
        "searchText": "",
      }
    `);
  });

  it('adds integration popover status to state', () => {
    const action = toggleIntegrationsPopover({
      id: 'popover-2',
      open: true,
    }) as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          monitorId: 'test',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": false,
        "basePath": "",
        "esKuery": "",
        "integrationsPopoverOpen": Object {
          "id": "popover-2",
          "open": true,
        },
        "monitorId": "test",
        "searchText": "",
      }
    `);
  });

  it('updates the alert flyout value', () => {
    const action = setAlertFlyoutVisible(true) as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          monitorId: 'test',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": true,
        "basePath": "",
        "esKuery": "",
        "integrationsPopoverOpen": null,
        "monitorId": "test",
        "searchText": "",
      }
    `);
  });

  it('sets the search text', () => {
    const action = setSearchTextAction('lorem ipsum') as Action<never>;
    expect(
      uiReducer(
        {
          alertFlyoutVisible: false,
          basePath: '',
          esKuery: '',
          integrationsPopoverOpen: null,
          searchText: '',
          monitorId: 'test',
        },
        action
      )
    ).toMatchInlineSnapshot(`
      Object {
        "alertFlyoutVisible": false,
        "basePath": "",
        "esKuery": "",
        "integrationsPopoverOpen": null,
        "monitorId": "test",
        "searchText": "lorem ipsum",
      }
    `);
  });
});
