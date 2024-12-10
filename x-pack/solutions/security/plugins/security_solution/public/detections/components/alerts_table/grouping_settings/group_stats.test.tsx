/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStats } from '.';

describe('getStats', () => {
  it('returns array of badges which corresponds to the field name', () => {
    const badgesRuleName = getStats('kibana.alert.rule.name', {
      key: ['Rule name test', 'Some description'],
      usersCountAggregation: {
        value: 10,
      },
      doc_count: 10,
    });

    expect(
      badgesRuleName.find(
        (badge) => badge.badge != null && badge.title === 'Users:' && badge.badge.value === 10
      )
    ).toBeTruthy();
    expect(
      badgesRuleName.find(
        (badge) => badge.badge != null && badge.title === 'Alerts:' && badge.badge.value === 10
      )
    ).toBeTruthy();

    const badgesHostName = getStats('host.name', {
      key: 'Host',
      rulesCountAggregation: {
        value: 3,
      },
      doc_count: 2,
    });

    expect(
      badgesHostName.find(
        (badge) => badge.badge != null && badge.title === 'Rules:' && badge.badge.value === 3
      )
    ).toBeTruthy();

    const badgesUserName = getStats('user.name', {
      key: 'User test',
      hostsCountAggregation: {
        value: 1,
      },
      doc_count: 1,
    });
    expect(
      badgesUserName.find(
        (badge) => badge.badge != null && badge.title === `Hosts:` && badge.badge.value === 1
      )
    ).toBeTruthy();
  });

  it('returns default badges if the field specific does not exist', () => {
    const badges = getStats('process.name', {
      key: 'process',
      rulesCountAggregation: {
        value: 3,
      },
      doc_count: 10,
    });

    expect(badges.length).toBe(2);
    expect(
      badges.find(
        (badge) => badge.badge != null && badge.title === 'Rules:' && badge.badge.value === 3
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) => badge.badge != null && badge.title === 'Alerts:' && badge.badge.value === 10
      )
    ).toBeTruthy();
  });
});
