/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedUserFields } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import {
  ManagedUserDatasetKey,
  type ManagedUserHits,
} from '../../../../../common/search_strategy/security_solution/users/managed_details';
import type { ManagedUserData } from '../types';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import type { UserItem } from '../../../../../common/search_strategy';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';

const anomaly = mockAnomalies.anomalies[0];

const observedUserDetails = {
  user: {
    id: ['1234', '321'],
    domain: ['test domain', 'another test domain'],
  },
  host: {
    ip: ['10.0.0.1', '127.0.0.1'],
    os: {
      name: ['testOs'],
      family: ['testFamily'],
    },
  },
};

export const mockObservedUser: ObservedEntityData<UserItem> = {
  details: observedUserDetails,
  isLoading: false,
  firstSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  lastSeen: {
    isLoading: false,
    date: '2023-02-23T20:03:17.489Z',
  },
  anomalies: {
    isLoading: false,
    anomalies: {
      anomalies: [anomaly],
      interval: '',
    },
    jobNameById: { [anomaly.jobId]: 'job_name' },
  },
};

export const mockOktaUserFields: ManagedUserFields = {
  '@timestamp': ['2023-11-16T13:42:23.074Z'],
  'event.dataset': [ManagedUserDatasetKey.OKTA],
  'user.profile.last_name': ['Okta last name'],
  'user.profile.first_name': ['Okta first name'],
  'user.profile.mobile_phone': ['1234567'],
  'user.profile.job_title': ['Okta Unit tester'],
  'user.geo.city_name': ["A'dam"],
  'user.geo.country_iso_code': ['NL'],
  'user.id': ['00ud9ohoh9ww644Px5d7'],
  'user.email': ['okta.test.user@elastic.co'],
  'user.name': ['okta.test.user@elastic.co'],
};

export const mockEntraUserFields: ManagedUserFields = {
  '@timestamp': ['2023-11-16T13:42:23.074Z'],
  'event.dataset': [ManagedUserDatasetKey.ENTRA],
  'user.id': ['12345'],
  'user.first_name': ['Entra first name'],
  'user.last_name': ['Entra last name'],
  'user.full_name': ['Entra full name'],
  'user.phone': ['123456'],
  'user.job_title': ['Entra Unit tester'],
  'user.work.location_name': ['USA, CA'],
};

export const managedUserDetails: ManagedUserHits = {
  [ManagedUserDatasetKey.ENTRA]: {
    fields: mockEntraUserFields,
    _index: 'test-index',
    _id: '123-test',
  },
};

export const mockManagedUserData: ManagedUserData = {
  data: managedUserDetails,
  isLoading: false,
  isIntegrationEnabled: true,
};
