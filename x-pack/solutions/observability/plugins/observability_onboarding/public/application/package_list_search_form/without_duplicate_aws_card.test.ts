/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { withoutDuplicateAwsCard } from './without_duplicate_aws_card';

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
const customOther = makeCard({ id: 'custom-other' });
const fleetOnboardingAws = makeCard({
  id: 'epr:aws',
  title: 'Amazon Web Services',
  searchMembers: [{ name: 'guardduty', title: 'Amazon GuardDuty' }],
});

describe('withoutDuplicateAwsCard', () => {
  it('drops the custom AWS card when Fleet has its AWS onboarding tile', () => {
    expect(withoutDuplicateAwsCard([customAws, customOther], [fleetOnboardingAws])).toEqual([
      customOther,
    ]);
  });

  it('keeps the custom AWS card when Fleet has no AWS onboarding tile', () => {
    const customCards = [customAws, customOther];
    expect(withoutDuplicateAwsCard(customCards, [makeCard({})])).toBe(customCards);
  });

  it('keeps the custom AWS card when epr:aws is a plain package card', () => {
    const customCards = [customAws];
    expect(withoutDuplicateAwsCard(customCards, [makeCard({ id: 'epr:aws' })])).toBe(customCards);
  });
});
