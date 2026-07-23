/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityFlyoutApi } from './use_entity_flyout_api';

/**
 * Returns a `useEntityFlyoutApi` return value with every method stubbed as a `jest.fn()`.
 * Use with `jest.mocked(useEntityFlyoutApi).mockReturnValue(createEntityFlyoutApiMock())`
 * and assert against the individual method you care about.
 */
export const createEntityFlyoutApiMock = (): jest.Mocked<EntityFlyoutApi> => ({
  openHostFlyout: jest.fn(),
  openHostFlyoutAsChild: jest.fn(),
  openUserFlyout: jest.fn(),
  openUserFlyoutAsChild: jest.fn(),
  openServiceFlyout: jest.fn(),
  openServiceFlyoutAsChild: jest.fn(),
  openGenericEntityFlyout: jest.fn(),
  openGenericEntityFlyoutAsChild: jest.fn(),
  openEntityDetailsAsChild: jest.fn(),
  openEntityRiskInputs: jest.fn(),
  openEntityAnomalyInsights: jest.fn(),
  openEntityAlertsInsights: jest.fn(),
  openEntityMisconfigurationInsights: jest.fn(),
  openEntityVulnerabilityInsights: jest.fn(),
  openEntityGraphView: jest.fn(),
  openEntityResolution: jest.fn(),
  openEntityEntraInsights: jest.fn(),
  openEntityOktaInsights: jest.fn(),
  openEntityFieldsTable: jest.fn(),
});
