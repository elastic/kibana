/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { createEsqlAlertsSourceEnricher } from '.';

const buildMockGetStartServices = (spaceId: string) =>
  jest.fn().mockResolvedValue([
    {},
    {
      spaces: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: spaceId }),
      },
    },
  ]);

describe('createEsqlAlertsSourceEnricher', () => {
  it('adds the alerts index for the current space when missing from sources', async () => {
    const enricher = createEsqlAlertsSourceEnricher(buildMockGetStartServices('default'));

    const result = await enricher([{ hidden: false, name: 'some-index' }]);

    expect(result).toContainEqual({ hidden: true, name: `${DEFAULT_ALERTS_INDEX}-default` });
  });

  it('uses the correct space id for non-default spaces', async () => {
    const enricher = createEsqlAlertsSourceEnricher(buildMockGetStartServices('my-space'));

    const result = await enricher([]);

    expect(result).toContainEqual({ hidden: true, name: `${DEFAULT_ALERTS_INDEX}-my-space` });
  });

  it('preserves existing sources when adding the alerts index', async () => {
    const enricher = createEsqlAlertsSourceEnricher(buildMockGetStartServices('default'));
    const existingSource = { hidden: false, name: 'some-index' };

    const result = await enricher([existingSource]);

    expect(result).toContainEqual(existingSource);
  });

  it('does not duplicate the alerts index when already present in sources', async () => {
    const enricher = createEsqlAlertsSourceEnricher(buildMockGetStartServices('default'));
    const alertsIndex = { hidden: true, name: `${DEFAULT_ALERTS_INDEX}-default` };

    const result = await enricher([alertsIndex]);

    expect(result.filter((s) => s.name === alertsIndex.name)).toHaveLength(1);
  });
});
