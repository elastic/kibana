/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { defaultGroupStatsRenderer, Severity } from '.';
import React from 'react';
import type { GenericBuckets } from '@kbn/grouping/src';

describe('Severity', () => {
  it('should return a single low severity UI', () => {
    const buckets: GenericBuckets[] = [{ key: 'low', doc_count: 10 }];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('Low')).toBeInTheDocument();
  });

  it('should return a single medium severity UI', () => {
    const buckets: GenericBuckets[] = [{ key: 'medium', doc_count: 10 }];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('Medium')).toBeInTheDocument();
  });

  it('should return a single high severity UI', () => {
    const buckets: GenericBuckets[] = [{ key: 'high', doc_count: 10 }];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('High')).toBeInTheDocument();
  });

  it('should return a single critical severity UI', () => {
    const buckets: GenericBuckets[] = [{ key: 'critical', doc_count: 10 }];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('Critical')).toBeInTheDocument();
  });

  it('should return a single unknown severity UI', () => {
    const buckets: GenericBuckets[] = [{ key: '', doc_count: 10 }];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('Unknown')).toBeInTheDocument();
  });

  it('should return a multi severity UI', () => {
    const buckets: GenericBuckets[] = [
      { key: 'low', doc_count: 10 },
      { key: 'medium', doc_count: 10 },
    ];

    const { getByText } = render(<Severity severities={buckets} />);

    expect(getByText('Multi')).toBeInTheDocument();
  });
});

describe('defaultGroupStatsRenderer', () => {
  it('should return array of badges for kibana.alert.rule.name field', () => {
    const badges = defaultGroupStatsRenderer('kibana.alert.rule.name', {
      key: '',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      usersCountAggregation: { value: 3 },
      hostsCountAggregation: { value: 5 },
      doc_count: 10,
    });

    expect(badges.length).toBe(4);
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Users:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 3
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 5
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 10
      )
    ).toBeTruthy();
  });

  it('should return array of badges for host.name field', () => {
    const badges = defaultGroupStatsRenderer('host.name', {
      key: '',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      usersCountAggregation: { value: 5 },
      rulesCountAggregation: { value: 3 },
      doc_count: 2,
    });

    expect(badges.length).toBe(4);
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Users:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 5
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 3
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 2
      )
    ).toBeTruthy();
  });

  it('should return array of badges for user.name field', () => {
    const badges = defaultGroupStatsRenderer('user.name', {
      key: '',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      rulesCountAggregation: { value: 2 },
      hostsCountAggregation: { value: 1 },
      doc_count: 1,
    });

    expect(badges.length).toBe(4);
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 1
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 2
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 1
      )
    ).toBeTruthy();
  });

  it('should return array of badges for source.ip field', () => {
    const badges = defaultGroupStatsRenderer('source.ip', {
      key: '',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
      rulesCountAggregation: { value: 16 },
      hostsCountAggregation: { value: 17 },
      doc_count: 18,
    });

    expect(badges.length).toBe(4);
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Hosts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 17
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 16
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Alerts:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 18
      )
    ).toBeTruthy();
  });

  it('should return default badges if the field specific does not exist', () => {
    const badges = defaultGroupStatsRenderer('process.name', {
      key: '',
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 10 }] },
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
