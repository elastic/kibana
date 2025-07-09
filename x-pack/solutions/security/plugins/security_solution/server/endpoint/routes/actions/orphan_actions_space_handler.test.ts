/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { UpdateOrphanActionsSpaceBody } from './orphan_actions_space_handler';
import { registerOrphanActionsSpaceRoute } from './orphan_actions_space_handler';
import { ORPHAN_ACTIONS_SPACE_ROUTE } from '../../../../common/endpoint/constants';
import type { RequestHandler } from '@kbn/core/server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { ReferenceDataClientInterface } from '../../lib/reference_data';
import { REF_DATA_KEY_INITIAL_VALUE, REF_DATA_KEYS } from '../../lib/reference_data';

describe('Orphan response action APIs', () => {
  let endpointServiceMock: HttpApiTestSetupMock['endpointAppContextMock']['service'];
  let apiTestSetup: HttpApiTestSetupMock<never, never, UpdateOrphanActionsSpaceBody | never>;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<never, never, UpdateOrphanActionsSpaceBody>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    never,
    never,
    UpdateOrphanActionsSpaceBody | never
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    never,
    never,
    UpdateOrphanActionsSpaceBody
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<never, never, UpdateOrphanActionsSpaceBody | never>();
    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);
    endpointServiceMock = apiTestSetup.endpointAppContextMock.service;

    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;

    registerOrphanActionsSpaceRoute(
      apiTestSetup.routerMock,
      apiTestSetup.endpointAppContextMock.service
    );

    const refDataClient =
      endpointServiceMock.getReferenceDataClient() as DeeplyMockedKeys<ReferenceDataClientInterface>;
    refDataClient.get.mockResolvedValue(
      REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace]()
    );
  });

  describe('GET: read orphan response actions space', () => {
    let readHandler: RequestHandler;

    beforeEach(() => {
      httpRequestMock = apiTestSetup.createRequestMock();

      readHandler = apiTestSetup.getRegisteredVersionedRoute(
        'get',
        ORPHAN_ACTIONS_SPACE_ROUTE,
        '1'
      ).routeHandler;
    });

    it('should require `canReadAdminData` privilege', async () => {
      (await endpointServiceMock.getEndpointAuthz(httpRequestMock)).canReadAdminData = false;

      await readHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.objectContaining({ message: 'Endpoint authorization failure' }),
      });
    });

    it('should return not found error if feature flag is disabled', async () => {
      // @ts-expect-error
      endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

      await readHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalledWith({
        body: expect.objectContaining({ message: 'Space awareness feature is disabled' }),
      });
    });

    it('should return expected response', async () => {
      await readHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: { data: { spaceId: '' } },
      });
    });
  });

  describe('POST: update orphan response actions space', () => {
    let writeHandler: RequestHandler;

    beforeEach(() => {
      httpRequestMock = apiTestSetup.createRequestMock();

      writeHandler = apiTestSetup.getRegisteredVersionedRoute(
        'post',
        ORPHAN_ACTIONS_SPACE_ROUTE,
        '1'
      ).routeHandler;

      httpRequestMock.body = { spaceId: 'foo' };
    });

    it('should require `canWriteAdminData` privilege', async () => {
      (await endpointServiceMock.getEndpointAuthz(httpRequestMock)).canWriteAdminData = false;

      await writeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.objectContaining({ message: 'Endpoint authorization failure' }),
      });
    });

    it('should return not found error if feature flag is disabled', async () => {
      // @ts-expect-error
      endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

      await writeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.notFound).toHaveBeenCalledWith({
        body: expect.objectContaining({ message: 'Space awareness feature is disabled' }),
      });
    });

    it('should update space id to reference data and return expected response', async () => {
      await writeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: { data: { spaceId: 'foo' } },
      });
    });
  });
});
