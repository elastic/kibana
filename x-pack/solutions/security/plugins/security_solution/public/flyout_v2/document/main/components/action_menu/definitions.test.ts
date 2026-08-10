/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSecurityActionMenuContributions } from '../../../../../common/components/security_action_menu';
import {
  DOCUMENT_ACTION_DEFINITIONS,
  DOCUMENT_ACTION_IDS,
  DOCUMENT_FLYOUT_ACTION_MENU_DEFINITION,
  DOCUMENT_FLYOUT_ACTION_MENU_PRESET,
} from './definitions';

describe('document flyout action menu definitions', () => {
  it('defines an icon and group for every document action', () => {
    const groupedActionIds = DOCUMENT_FLYOUT_ACTION_MENU_PRESET.groups.flatMap(
      ({ actionIds }) => actionIds
    );

    expect(new Set(groupedActionIds)).toEqual(new Set(Object.keys(DOCUMENT_ACTION_DEFINITIONS)));
    expect(Object.values(DOCUMENT_ACTION_DEFINITIONS).every(({ icon }) => icon != null)).toBe(true);
  });

  it('creates one decorated contribution per visible action', () => {
    const panels = [{ id: 'statusPanel' }];
    const contributions = createSecurityActionMenuContributions(
      DOCUMENT_FLYOUT_ACTION_MENU_DEFINITION,
      {
        changeStatus: {
          items: [
            { key: 'open', name: 'Mark as open' },
            { key: 'acknowledge', name: 'Mark as acknowledged' },
            { key: 'close-alert-with-reason', name: 'Mark as closed' },
          ],
          panels,
        },
      }
    );

    expect(contributions).toMatchObject([
      {
        id: DOCUMENT_ACTION_IDS.markAsOpen,
        items: [
          {
            key: 'open',
            name: 'Mark as open',
            icon: { props: { type: 'dot', color: 'danger' } },
          },
        ],
        panels,
      },
      {
        id: DOCUMENT_ACTION_IDS.markAsAcknowledged,
        items: [
          {
            key: 'acknowledge',
            name: 'Mark as acknowledged',
            icon: { props: { type: 'dot', color: 'primary' } },
          },
        ],
      },
      {
        id: DOCUMENT_ACTION_IDS.markAsClosed,
        items: [
          {
            key: 'close-alert-with-reason',
            name: 'Mark as closed',
            icon: { props: { type: 'dot', color: 'subdued' } },
          },
        ],
      },
    ]);
  });

  it('includes entries only when every visibility condition is met', () => {
    expect(
      createSecurityActionMenuContributions(DOCUMENT_FLYOUT_ACTION_MENU_DEFINITION, {
        applyAlertTags: { items: [{ name: 'Action' }], visibleWhen: [true, true] },
      })
    ).toHaveLength(1);
    expect(
      createSecurityActionMenuContributions(DOCUMENT_FLYOUT_ACTION_MENU_DEFINITION, {
        applyAlertTags: { items: [{ name: 'Action' }], visibleWhen: [true, false] },
      })
    ).toEqual([]);
  });
});
