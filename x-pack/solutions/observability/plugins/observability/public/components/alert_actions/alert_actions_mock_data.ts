/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AttachmentType, CaseSeverity, CaseUI, ConnectorTypes } from '@kbn/cases-plugin/common';
import { CaseStatuses } from '@kbn/cases-components';
import { AttachmentUI } from '@kbn/cases-plugin/common/ui/types';

export const caseComment: AttachmentUI = {
  alertId: ['6d4c6d74-d51a-495c-897d-88ced3b95e30'],
  index: ['alert-index-1'],
  type: AttachmentType.alert,
  id: 'alert-comment-id',
  owner: 'observability',
  createdAt: '2024-01-01T00:00:00.000Z',
  createdBy: {
    username: 'test-user',
    fullName: 'Test User',
    email: 'test.user@example.com',
  },
  pushedAt: null,
  pushedBy: null,
  rule: {
    id: 'rule-id-1',
    name: 'Awesome rule',
  },
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const basicCase: CaseUI = {
  owner: 'observability',
  closedAt: null,
  closedBy: null,
  id: 'my-case-id',
  comments: [caseComment],
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  description: 'Security banana Issue',
  severity: CaseSeverity.LOW,
  duration: null,
  externalService: null,
  status: CaseStatuses.open,
  tags: [],
  title: 'Another horrible breach!!',
  totalComment: 1,
  totalAlerts: 0,
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
  },
  // damaged_raccoon uid
  assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
  category: null,
  customFields: [],
  observables: [],
  incrementalId: undefined,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdBy: {
    username: 'test-user',
    fullName: 'Test User',
    email: 'test.user@example.com',
  },
  updatedBy: {
    username: 'test-user',
    fullName: 'Test User',
    email: 'test.user@example.com',
  },
};
