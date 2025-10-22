/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  getIntegrationComponent,
  groupStatsRenderer,
  IntegrationIcon,
  TABLE_GROUP_STATS_TEST_ID,
} from './group_stats_renderers';
import { useTableSectionContext } from './table_section_context';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import { INTEGRATION_ICON_TEST_ID } from '../common/integration_icon';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';

jest.mock('@kbn/fleet-plugin/public/hooks');
jest.mock('./table_section_context');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '0.1.0',
  },
];

describe('getIntegrationComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty array', () => {
    const groupStatsItems = getIntegrationComponent({
      key: '',
      relatedIntegrationSubAggregation: { buckets: [] },
      doc_count: 2,
    });

    expect(groupStatsItems.length).toBe(0);
  });

  it('should return a single integration', () => {
    const groupStatsItems = getIntegrationComponent({
      key: '',
      relatedIntegrationSubAggregation: { buckets: [{ key: 'crowdstrike', doc_count: 10 }] },
      doc_count: 2,
    });

    expect(groupStatsItems.length).toBe(1);
    expect(groupStatsItems[0].component).toMatchInlineSnapshot(`
      <Memo(IntegrationIcon)
        integrationName="crowdstrike"
      />
    `);
  });

  it('should return a single integration loading', () => {
    const groupStatsItems = getIntegrationComponent({
      key: '',
      relatedIntegrationSubAggregation: {
        buckets: [
          { key: 'crowdstrike', doc_count: 10 },
          {
            key: 'google_secops',
            doc_count: 10,
          },
        ],
      },
      doc_count: 2,
    });

    expect(groupStatsItems.length).toBe(1);
    expect(groupStatsItems[0].component).toMatchInlineSnapshot(`
      <React.Fragment>
         Multi
      </React.Fragment>
`);
  });
});

describe('IntegrationIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render integration icon', () => {
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');
    (useTableSectionContext as jest.Mock).mockReturnValue({
      packages,
      ruleResponse: {},
    });

    const { getByTestId } = render(<IntegrationIcon integrationName={'splunk'} />);

    expect(
      getByTestId(`${TABLE_GROUP_STATS_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`)
    ).toBeInTheDocument();
  });

  it('should not render icon', () => {
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');
    (useTableSectionContext as jest.Mock).mockReturnValue({
      packages: [],
      ruleResponse: {},
    });

    const { queryByTestId } = render(<IntegrationIcon integrationName={'splunk'} />);

    expect(
      queryByTestId(`${TABLE_GROUP_STATS_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`)
    ).not.toBeInTheDocument();
  });
});

describe('groupStatsRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return array of badges for relatedIntegration field', () => {
    const badges = groupStatsRenderer('relatedIntegration', {
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
          badge.badge.value === 10
      )
    ).toBeTruthy();
  });

  it('should return array of badges for kibana.alert.severity field', () => {
    const badges = groupStatsRenderer('kibana.alert.severity', {
      key: '',
      relatedIntegrationSubAggregation: { buckets: [{ key: 'crowdstrike', doc_count: 10 }] },
      rulesCountAggregation: { value: 4 },
      doc_count: 2,
    });

    expect(badges.length).toBe(3);
    expect(
      badges.find(
        (badge) => badge.title === 'Integrations:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) =>
          badge.title === 'Rules:' &&
          badge.component == null &&
          badge.badge != null &&
          badge.badge.value === 4
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

  it('should return array of badges for kibana.alert.rule.name field', () => {
    const badges = groupStatsRenderer('kibana.alert.rule.name', {
      key: '',
      relatedIntegrationSubAggregation: { buckets: [{ key: 'crowdstrike', doc_count: 9 }] },
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 8 }] },
      doc_count: 1,
    });

    expect(badges.length).toBe(3);
    expect(
      badges.find(
        (badge) => badge.title === 'Integrations:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
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

  it('should return default badges if the field does not exist', () => {
    const badges = groupStatsRenderer('process.name', {
      key: '',
      relatedIntegrationSubAggregation: { buckets: [{ key: 'crowdstrike', doc_count: 4 }] },
      severitiesSubAggregation: { buckets: [{ key: 'medium', doc_count: 5 }] },
      rulesCountAggregation: { value: 2 },
      doc_count: 11,
    });

    expect(badges.length).toBe(4);
    expect(
      badges.find(
        (badge) => badge.title === 'Integrations:' && badge.component != null && badge.badge == null
      )
    ).toBeTruthy();
    expect(
      badges.find(
        (badge) => badge.title === 'Severity:' && badge.component != null && badge.badge == null
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
          badge.badge.value === 11
      )
    ).toBeTruthy();
  });
});
