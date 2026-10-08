/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { buildPackageList } from './build_package_list';

const makeCard = (overrides: Partial<IntegrationCardItem>): IntegrationCardItem => ({
  id: 'epr:nginx',
  name: 'nginx',
  title: 'Nginx',
  description: '',
  categories: ['observability'],
  icons: [],
  url: '',
  version: '',
  integration: '',
  ...overrides,
});

const customAws = makeCard({ id: 'aws-logs-virtual', title: 'Amazon Web Services' });
const fleetAws = makeCard({
  id: 'epr:aws',
  title: 'Amazon Web Services',
  searchMembers: [{ name: 'guardduty', title: 'Amazon GuardDuty' }],
});
const nginx = makeCard({});

const build = (overrides: Partial<Parameters<typeof buildPackageList>[0]>) =>
  buildPackageList({ customCards: [], fleetCards: [], excludePackageIdList: [], ...overrides });

describe('buildPackageList', () => {
  it('lists custom cards first, then Fleet cards', () => {
    const custom = makeCard({ id: 'custom' });
    expect(build({ customCards: [custom], fleetCards: [nginx] })).toEqual([custom, nginx]);
  });

  it('keeps only the categories this flow shows', () => {
    const other = makeCard({ id: 'epr:crm', categories: ['crm'] });
    const osSystem = makeCard({ id: 'epr:system', categories: ['os_system'] });
    expect(build({ fleetCards: [other, osSystem] })).toEqual([osSystem]);
  });

  it('drops excluded ids', () => {
    expect(build({ fleetCards: [nginx], excludePackageIdList: ['epr:nginx'] })).toEqual([]);
  });

  it('drops the custom AWS card when Fleet AWS onboarding tile is shown', () => {
    expect(build({ customCards: [customAws], fleetCards: [fleetAws] })).toEqual([fleetAws]);
  });

  it('keeps the custom AWS card when Fleet AWS tile has no allowed category', () => {
    const fleetAwsHidden = { ...fleetAws, categories: ['aws'] };
    expect(build({ customCards: [customAws], fleetCards: [fleetAwsHidden] })).toEqual([customAws]);
  });

  it('keeps the custom AWS card when Fleet AWS tile is excluded', () => {
    expect(
      build({
        customCards: [customAws],
        fleetCards: [fleetAws],
        excludePackageIdList: ['epr:aws'],
      })
    ).toEqual([customAws]);
  });

  it('keeps the custom AWS card when Fleet returned no cards', () => {
    expect(build({ customCards: [customAws], fleetCards: [] })).toEqual([customAws]);
  });
});
