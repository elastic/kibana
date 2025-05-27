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
      key: [],
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      countSeveritySubAggregation: { value: 1 },
      usersCountAggregation: { value: 3 },
      hostsCountAggregation: { value: 5 },
      doc_count: 10,
    });

    expect(badgesRuleName.length).toBe(4);
    expect(
      badgesRuleName.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badgesRuleName.find(
        (badge) =>
          badge.title === 'Users:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 3
      )
    ).toBeTruthy();
    expect(
      badgesRuleName.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 5
      )
    ).toBeTruthy();
    expect(
      badgesRuleName.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 10
      )
    ).toBeTruthy();

    const badgesHostName = getStats('host.name', {
      key: 'Host',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      countSeveritySubAggregation: { value: 1 },
      usersCountAggregation: { value: 5 },
      rulesCountAggregation: { value: 3 },
      doc_count: 2,
    });

    expect(badgesHostName.length).toBe(4);
    expect(
      badgesHostName.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badgesHostName.find(
        (badge) =>
          badge.title === 'Users:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 5
      )
    ).toBeTruthy();
    expect(
      badgesHostName.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 3
      )
    ).toBeTruthy();
    expect(
      badgesHostName.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 2
      )
    ).toBeTruthy();

    const badgesUserName = getStats('user.name', {
      key: 'User test',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      countSeveritySubAggregation: { value: 1 },
      rulesCountAggregation: { value: 2 },
      hostsCountAggregation: { value: 1 },
      doc_count: 1,
    });

    expect(badgesUserName.length).toBe(4);
    expect(
      badgesUserName.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badgesUserName.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 1
      )
    ).toBeTruthy();
    expect(
      badgesUserName.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 2
      )
    ).toBeTruthy();
    expect(
      badgesUserName.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 1
      )
    ).toBeTruthy();

    const badgesSourceIp = getStats('source.ip', {
      key: 'User test',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      countSeveritySubAggregation: { value: 1 },
      rulesCountAggregation: { value: 16 },
      hostsCountAggregation: { value: 17 },
      doc_count: 18,
    });

    expect(badgesSourceIp.length).toBe(4);
    expect(
      badgesSourceIp.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badgesSourceIp.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 17
      )
    ).toBeTruthy();
    expect(
      badgesSourceIp.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 16
      )
    ).toBeTruthy();
    expect(
      badgesSourceIp.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 18
      )
    ).toBeTruthy();
  });

  it('should return default badges if the field specific does not exist', () => {
    const badges = getStats('process.name', {
      key: 'process',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      countSeveritySubAggregation: { value: 1 },
      rulesCountAggregation: { value: 3 },
      doc_count: 10,
    });

    expect(badges.length).toBe(3);
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) => badge.title === 'Rules:' && badge.component == null && badge.badge?.value === 3
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) => badge.title === 'Alerts:' && badge.component == null && badge.badge?.value === 10
      )
    ).toBeTruthy();
  });
});
