/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { asSpaceId } from '@kbn/core-spaces-common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { searchServiceMock } from '@kbn/data-plugin/public/search/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { EntityType } from '@kbn/entity-store/common';
import { of, throwError } from 'rxjs';
import { EntityRiskQueries } from '../../../../../common/api/search_strategy';
import {
  EntityType as RiskScoreEntityType,
  getRiskIndex,
} from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { useShouldInstallServiceEngine } from './use_should_install_service_engine';

jest.mock('../../../../common/lib/kibana/kibana_react');
jest.mock('../../../api/entity_store');

const search = searchServiceMock.createStartContract();
const data = {
  ...dataPluginMock.createStartContract(),
  search,
};
const spaces = spacesPluginMock.createStartContract();
const getEntityStoreStatus = jest.fn();

describe('useShouldInstallServiceEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spaces.getActiveSpace.mockResolvedValue({
      id: asSpaceId('space-a'),
      name: 'Space A',
      disabledFeatures: [],
    });
    getEntityStoreStatus.mockResolvedValue({ status: 'running', engines: [] });
    search.search.mockImplementation(() => of({ totalCount: 0, rawResponse: {} }));
    (useKibana as jest.Mock).mockReturnValue({
      services: { data, spaces, logger: { error: jest.fn() } },
    });
    (useEntityStoreRoutes as jest.Mock).mockReturnValue({ getEntityStoreStatus });
  });

  it('returns false when neither a service engine nor service risk scores exist', async () => {
    const { result } = renderHook(() => useShouldInstallServiceEngine());

    await expect(result.current()).resolves.toBe(false);
    expect(search.search).toHaveBeenCalledWith(
      {
        defaultIndex: [getRiskIndex('space-a')],
        factoryQueryType: EntityRiskQueries.list,
        pagination: { cursorStart: 0, querySize: 1 },
        riskScoreEntity: RiskScoreEntityType.service,
      },
      expect.objectContaining({ strategy: 'securitySolutionSearchStrategy' })
    );
  });

  it('returns true when a service engine already exists', async () => {
    getEntityStoreStatus.mockResolvedValueOnce({
      status: 'running',
      engines: [{ type: EntityType.enum.service }],
    });
    const { result } = renderHook(() => useShouldInstallServiceEngine());

    await expect(result.current()).resolves.toBe(true);
  });

  it('returns true when service risk scores exist', async () => {
    search.search.mockImplementation(() => of({ totalCount: 1, rawResponse: {} }));
    const { result } = renderHook(() => useShouldInstallServiceEngine());

    await expect(result.current()).resolves.toBe(true);
  });

  it('treats a missing risk index as having no service risk scores', async () => {
    search.search.mockImplementation(() =>
      throwError(() => ({
        attributes: { caused_by: { type: 'index_not_found_exception' } },
      }))
    );
    const { result } = renderHook(() => useShouldInstallServiceEngine());

    await expect(result.current()).resolves.toBe(false);
  });

  it('returns true and logs when the check fails for a reason other than a missing index', async () => {
    const error = new Error('search failed');
    const logger = { error: jest.fn() };
    (useKibana as jest.Mock).mockReturnValue({
      services: { data, spaces, logger },
    });
    search.search.mockImplementation(() => throwError(() => error));
    const { result } = renderHook(() => useShouldInstallServiceEngine());

    await expect(result.current()).resolves.toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
});
