/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { expect } from '@kbn/scout-oblt/api';
import type { ApiClientFixture, KbnClient } from '@kbn/scout-oblt';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../../common/types/saved_objects';
import { apiTest, LOCAL_PUBLIC_LOCATION, mergeSyntheticsApiHeaders } from '.';
import {
  deleteMonitorByIdParam,
  editMonitorInternal,
  listMonitors,
  saveMonitorInternal,
} from './monitors';
import { httpMonitorFixture } from './data/http_monitor';
import type { ScoutPrivateLocation } from '../services/synthetics_private_location_api_service';

type MonitorBody = Record<string, unknown>;
interface MonitorResponse {
  id: string;
  name: string;
  [key: string]: unknown;
}
interface FoundSavedObject {
  id: string;
  attributes: { name?: string };
  namespaces?: string[];
}

const SO_TYPES = [legacySyntheticsMonitorTypeSingle, syntheticsMonitorSavedObjectType];

/**
 * Shared body of the FTR
 * `apis/synthetics/legacy_and_multispace_monitor_api.ts` `runTests` matrix.
 *
 * The FTR ran this twice — once with a public location (`skipCloud`) and once
 * with an all-spaces private location — under nested describes. Scout allows
 * only one root describe per file, so each scenario gets its own thin spec
 * file that opens a single describe and calls this registrar (mirroring the
 * FTR `runTests(context, { usePrivateLocations })` shape). Closure state is
 * declared per call so the two scenarios stay isolated.
 */
export const registerLegacyAndMultiSpaceTests = ({
  usePrivateLocations,
  suiteName,
}: {
  usePrivateLocations: boolean;
  suiteName: string;
}) => {
  apiTest.describe(
    suiteName,
    { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
    () => {
      let editorHeaders: Record<string, string>;
      // All-spaces private location used for the happy-path tests (mirrors the
      // FTR suite-level `privateLocation`). `undefined` in the public scenario.
      let sharedPrivateLocation: ScoutPrivateLocation | undefined;
      // Single-space private location + space reused by the space-validation tests.
      let validationSpaceId: string;
      let validationPrivateLocation: ScoutPrivateLocation | undefined;
      const spacesToCleanUp: string[] = [];

      /**
       * Applies the scenario's location to a monitor body. Public uses the
       * Elastic-managed `dev` location; private swaps `locations` for
       * `private_locations` pointing at `customLocation` (or the shared all-spaces
       * location). Mirrors the FTR `applyLocation` helper.
       */
      const withLocation = (
        monitor: MonitorBody,
        customLocation?: ScoutPrivateLocation
      ): MonitorBody => {
        if (!usePrivateLocations) {
          return { ...httpMonitorFixture, ...monitor, locations: [LOCAL_PUBLIC_LOCATION] };
        }
        const location = customLocation ?? sharedPrivateLocation;
        const { locations, ...rest } = { ...httpMonitorFixture, ...monitor };
        return { ...rest, private_locations: [location!.id] };
      };

      const saveMonitor = async (
        apiClient: ApiClientFixture,
        monitor: MonitorBody,
        savedObjectType: string,
        spaceId?: string
      ): Promise<MonitorResponse> => {
        const body = spaceId ? { ...monitor, spaces: [spaceId] } : monitor;
        const res = await saveMonitorInternal(apiClient, editorHeaders, body, {
          spaceId,
          savedObjectType,
        });
        return res.body as MonitorResponse;
      };

      const editMonitor = async (
        apiClient: ApiClientFixture,
        monitorId: string,
        monitor: MonitorBody,
        spaceId?: string
      ): Promise<MonitorResponse> => {
        const res = await editMonitorInternal(apiClient, editorHeaders, monitorId, monitor, {
          spaceId,
        });
        return res.body as MonitorResponse;
      };

      const deleteMonitor = async (
        apiClient: ApiClientFixture,
        monitorId: string,
        spaceId?: string
      ): Promise<Array<{ id: string }>> => {
        const res = await deleteMonitorByIdParam(apiClient, editorHeaders, monitorId, { spaceId });
        return res.body as Array<{ id: string }>;
      };

      const findByType = async (
        kbnClient: KbnClient,
        type: string,
        space?: string
      ): Promise<FoundSavedObject[]> => {
        const res = await kbnClient.savedObjects.find<{ name?: string }>({ type, space });
        return res.saved_objects as FoundSavedObject[];
      };

      apiTest.beforeAll(async ({ requestAuth, kbnClient, apiServices }) => {
        await kbnClient.savedObjects.clean({ types: SO_TYPES });
        const { apiKeyHeader } = await requestAuth.getApiKey('editor');
        editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });

        if (usePrivateLocations) {
          // All-spaces so monitors can be shared to ad-hoc spaces without re-sharing
          // the location (mirrors the FTR suite-level private location).
          sharedPrivateLocation =
            await apiServices.syntheticsPrivateLocations.addTestPrivateLocation([ALL_SPACES_ID]);
        }

        validationSpaceId = `validation-space-${uuidv4()}`;
        await kbnClient.spaces.create({ id: validationSpaceId, name: 'Validation Space' });
        spacesToCleanUp.push(validationSpaceId);
        if (usePrivateLocations) {
          validationPrivateLocation =
            await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(validationSpaceId);
        }
      });

      apiTest.afterAll(async ({ kbnClient, apiServices }) => {
        await kbnClient.savedObjects.clean({ types: SO_TYPES });
        for (const spaceId of spacesToCleanUp) {
          await kbnClient.spaces.delete(spaceId).catch(() => {});
        }
        spacesToCleanUp.length = 0;
        await apiServices.syntheticsPrivateLocations.cleanUpPrivateLocationsAndPolicies();
      });

      // --- Legacy and Multi-space monitor CRUD ---

      apiTest('should create a legacy monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const legacy = await saveMonitor(
          apiClient,
          withLocation({ name: `legacy-${uuid}` }),
          legacySyntheticsMonitorTypeSingle
        );
        expect(legacy.name).toBe(`legacy-${uuid}`);

        const legacySos = await findByType(kbnClient, legacySyntheticsMonitorTypeSingle);
        expect(legacySos.some((so) => so.id === legacy.id)).toBe(true);
        const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
        expect(multiSos.some((so) => so.id === legacy.id)).toBe(false);

        await deleteMonitor(apiClient, legacy.id);
      });

      apiTest('should create a multi-space monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const multi = await saveMonitor(
          apiClient,
          withLocation({ name: `multi-${uuid}` }),
          syntheticsMonitorSavedObjectType
        );
        expect(multi.name).toBe(`multi-${uuid}`);

        const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
        const found = multiSos.find((so) => so.id === multi.id);
        expect(found != null).toBe(true);
        expect(found?.attributes.name).toBe(`multi-${uuid}`);

        await deleteMonitor(apiClient, multi.id);
      });

      apiTest('should edit a legacy monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const legacy = await saveMonitor(
          apiClient,
          withLocation({ name: `legacy-${uuid}` }),
          legacySyntheticsMonitorTypeSingle
        );

        const edited = await editMonitor(apiClient, legacy.id, { name: `legacy-edited-${uuid}` });
        expect(edited.name).toBe(`legacy-edited-${uuid}`);

        const legacySos = await findByType(kbnClient, legacySyntheticsMonitorTypeSingle);
        const found = legacySos.find((so) => so.id === legacy.id);
        expect(found != null).toBe(true);
        expect(found?.attributes.name).toBe(`legacy-edited-${uuid}`);

        await deleteMonitor(apiClient, legacy.id);
      });

      apiTest('should edit a multi-space monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const multi = await saveMonitor(
          apiClient,
          withLocation({ name: `multi-${uuid}` }),
          syntheticsMonitorSavedObjectType
        );

        const edited = await editMonitor(apiClient, multi.id, { name: `multi-edited-${uuid}` });
        expect(edited.name).toBe(`multi-edited-${uuid}`);

        const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
        const found = multiSos.find((so) => so.id === multi.id);
        expect(found != null).toBe(true);
        expect(found?.attributes.name).toBe(`multi-edited-${uuid}`);

        await deleteMonitor(apiClient, multi.id);
      });

      apiTest('should delete a legacy monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const legacy = await saveMonitor(
          apiClient,
          withLocation({ name: `legacy-${uuid}` }),
          legacySyntheticsMonitorTypeSingle
        );

        const del = await deleteMonitor(apiClient, legacy.id);
        expect(del[0].id).toBe(legacy.id);

        const legacySos = await findByType(kbnClient, legacySyntheticsMonitorTypeSingle);
        expect(legacySos.some((so) => so.id === legacy.id)).toBe(false);
      });

      apiTest('should delete a multi-space monitor', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const multi = await saveMonitor(
          apiClient,
          withLocation({ name: `multi-${uuid}` }),
          syntheticsMonitorSavedObjectType
        );

        const del = await deleteMonitor(apiClient, multi.id);
        expect(del[0].id).toBe(multi.id);

        const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
        expect(multiSos.some((so) => so.id === multi.id)).toBe(false);
      });

      apiTest(
        'should allow editing spaces of a legacy monitor (convert to multi-space type)',
        async ({ apiClient, kbnClient }) => {
          const uuid = uuidv4();
          const legacy = await saveMonitor(
            apiClient,
            withLocation({ name: `legacy-to-multi-${uuid}` }),
            legacySyntheticsMonitorTypeSingle
          );
          const newSpace = `edit-space-${uuid}`;
          await kbnClient.spaces.create({ id: newSpace, name: `Edit Space ${uuid}` });
          spacesToCleanUp.push(newSpace);

          await editMonitor(apiClient, legacy.id, {
            spaces: ['default', newSpace],
            name: `legacy-now-multi-${uuid}`,
          });

          const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
          const foundMulti = multiSos.find((so) => so.id === legacy.id);
          expect(foundMulti != null).toBe(true);
          expect(foundMulti?.attributes.name).toBe(`legacy-now-multi-${uuid}`);
          expect(foundMulti?.namespaces?.includes(newSpace)).toBe(true);

          const legacySos = await findByType(kbnClient, legacySyntheticsMonitorTypeSingle);
          expect(legacySos.some((so) => so.id === legacy.id)).toBe(false);

          await deleteMonitor(apiClient, legacy.id);
        }
      );

      apiTest(
        'should allow editing spaces of a multi-space monitor',
        async ({ apiClient, kbnClient }) => {
          const uuid = uuidv4();
          const multi = await saveMonitor(
            apiClient,
            withLocation({ name: `multi-edit-spaces-${uuid}` }),
            syntheticsMonitorSavedObjectType
          );
          const space1 = `multi-space1-${uuid}`;
          const space2 = `multi-space2-${uuid}`;
          await kbnClient.spaces.create({ id: space1, name: `Multi Space 1 ${uuid}` });
          await kbnClient.spaces.create({ id: space2, name: `Multi Space 2 ${uuid}` });
          spacesToCleanUp.push(space1, space2);

          await editMonitor(apiClient, multi.id, {
            spaces: ['default', space1, space2],
            name: `multi-edited-spaces-${uuid}`,
          });

          const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
          const found = multiSos.find((so) => so.id === multi.id);
          expect(found != null).toBe(true);
          expect(found?.attributes.name).toBe(`multi-edited-spaces-${uuid}`);
          expect(found?.namespaces?.includes(space1)).toBe(true);
          expect(found?.namespaces?.includes(space2)).toBe(true);

          await editMonitor(apiClient, multi.id, {
            spaces: ['default', space2],
            name: `multi-edited-spaces2-${uuid}`,
          });
          const multiSos2 = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
          const found2 = multiSos2.find((so) => so.id === multi.id);
          expect(found2?.namespaces?.includes(space1)).toBe(false);
          expect(found2?.namespaces?.includes(space2)).toBe(true);

          await deleteMonitor(apiClient, multi.id);
        }
      );

      apiTest('should delete a monitor after editing spaces', async ({ apiClient, kbnClient }) => {
        const uuid = uuidv4();
        const legacy = await saveMonitor(
          apiClient,
          withLocation({ name: `legacy-del-after-edit-${uuid}` }),
          legacySyntheticsMonitorTypeSingle
        );
        const delSpace = `del-space-${uuid}`;
        await kbnClient.spaces.create({ id: delSpace, name: `Del Space ${uuid}` });
        spacesToCleanUp.push(delSpace);

        await editMonitor(apiClient, legacy.id, {
          spaces: ['default', delSpace],
          name: `legacy-del-multi-${uuid}`,
        });
        const del = await deleteMonitor(apiClient, legacy.id);
        expect(del[0].id).toBe(legacy.id);

        const multiSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
        expect(multiSos.some((so) => so.id === legacy.id)).toBe(false);
      });

      // --- Multi-space monitor filtering ---

      apiTest(
        'should filter all monitors (showFromAllSpaces)',
        async ({ apiClient, kbnClient, apiServices }) => {
          const uuid = uuidv4();
          const spaceId = `test-space-${uuid}`;
          await kbnClient.spaces.create({ id: spaceId, name: `Test Space ${uuid}` });
          spacesToCleanUp.push(spaceId);

          const otherSpaceLocation = usePrivateLocations
            ? await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(spaceId)
            : undefined;

          const monitorDefault = await saveMonitor(
            apiClient,
            withLocation({ name: `default-${uuid}` }),
            syntheticsMonitorSavedObjectType
          );
          const monitorSpace = await saveMonitor(
            apiClient,
            withLocation({ name: `space-${uuid}` }, otherSpaceLocation),
            syntheticsMonitorSavedObjectType,
            spaceId
          );
          const legacyMonitorSpace = await saveMonitor(
            apiClient,
            withLocation({ name: `legacy-space-${uuid}` }, otherSpaceLocation),
            legacySyntheticsMonitorTypeSingle,
            spaceId
          );

          const res = await listMonitors(
            apiClient,
            editorHeaders,
            'showFromAllSpaces=true&perPage=1000'
          );
          const monitors = (res.body as { monitors: Array<{ id: string }> }).monitors;
          const ids = [monitorDefault.id, monitorSpace.id, legacyMonitorSpace.id];
          expect(monitors.filter((m) => ids.includes(m.id))).toHaveLength(3);

          const defaultSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType);
          expect(defaultSos.some((so) => so.id === monitorDefault.id)).toBe(true);

          const spaceSos = await findByType(kbnClient, syntheticsMonitorSavedObjectType, spaceId);
          expect(spaceSos.some((so) => so.id === monitorSpace.id)).toBe(true);

          const legacySpaceSos = await findByType(
            kbnClient,
            legacySyntheticsMonitorTypeSingle,
            spaceId
          );
          expect(legacySpaceSos.some((so) => so.id === legacyMonitorSpace.id)).toBe(true);

          await deleteMonitor(apiClient, monitorDefault.id);
          await deleteMonitor(apiClient, monitorSpace.id, spaceId);
          await deleteMonitor(apiClient, legacyMonitorSpace.id, spaceId);
        }
      );

      // --- Monitor search by name ---

      apiTest('should find both legacy and multi-space monitors by name', async ({ apiClient }) => {
        const searchUuid = uuidv4();
        const legacy = await saveMonitor(
          apiClient,
          withLocation({ name: `legacy-search-${searchUuid}` }),
          legacySyntheticsMonitorTypeSingle
        );
        const multi = await saveMonitor(
          apiClient,
          withLocation({ name: `multi-search-${searchUuid}` }),
          syntheticsMonitorSavedObjectType
        );

        const res = await listMonitors(
          apiClient,
          editorHeaders,
          `query=${encodeURIComponent(`search-${searchUuid}`)}&perPage=1000`
        );
        const monitors = (res.body as { monitors: Array<{ id: string; name: string }> }).monitors;
        expect(
          monitors.some((m) => m.id === legacy.id && m.name === `legacy-search-${searchUuid}`)
        ).toBe(true);
        expect(
          monitors.some((m) => m.id === multi.id && m.name === `multi-search-${searchUuid}`)
        ).toBe(true);

        await deleteMonitor(apiClient, legacy.id);
        await deleteMonitor(apiClient, multi.id);
      });

      // --- Monitor space validation ---

      apiTest(
        'should throw error if spaces list does not include the calling space on create',
        async ({ apiClient }) => {
          const monitorData = withLocation(
            { name: `invalid-create-${uuidv4()}`, spaces: ['default'] },
            validationPrivateLocation
          );
          const res = await saveMonitorInternal(apiClient, editorHeaders, monitorData, {
            spaceId: validationSpaceId,
            statusCode: 400,
          });
          expect((res.body as { message: string }).message).toBe(
            'Invalid space ID provided in monitor configuration. It should always include the current space ID.'
          );
        }
      );

      apiTest(
        'should throw error if spaces list does not include the calling space on edit',
        async ({ apiClient }) => {
          const monitorData = withLocation(
            { name: `edit-invalid-${uuidv4()}`, spaces: [validationSpaceId] },
            validationPrivateLocation
          );
          const created = await saveMonitor(
            apiClient,
            monitorData,
            syntheticsMonitorSavedObjectType,
            validationSpaceId
          );

          const res = await editMonitorInternal(
            apiClient,
            editorHeaders,
            created.id,
            { name: `edit-invalid-${uuidv4()}`, spaces: ['default'] },
            { spaceId: validationSpaceId, statusCode: 400 }
          );
          expect((res.body as { message: string }).message).toBe(
            'Invalid space ID provided in monitor configuration. It should always include the current space ID.'
          );

          await deleteMonitor(apiClient, created.id, validationSpaceId);
        }
      );

      if (usePrivateLocations) {
        apiTest(
          'should throw error if a private location is not shared to all monitor spaces on edit',
          async ({ apiClient, kbnClient, apiServices }) => {
            // Dedicated single-space private location so we can assert the edit is
            // rejected when sharing to a space the location does not cover.
            const singleSpaceLocation =
              await apiServices.syntheticsPrivateLocations.addTestPrivateLocation();

            const otherSpaceId = `pl-coverage-other-${uuidv4()}`;
            await kbnClient.spaces.create({ id: otherSpaceId, name: 'PL Coverage Other Space' });
            spacesToCleanUp.push(otherSpaceId);

            const created = await saveMonitor(
              apiClient,
              withLocation({ name: `pl-coverage-${uuidv4()}` }, singleSpaceLocation),
              syntheticsMonitorSavedObjectType
            );

            const res = await editMonitorInternal(
              apiClient,
              editorHeaders,
              created.id,
              { name: `pl-coverage-edit-${uuidv4()}`, spaces: ['default', otherSpaceId] },
              { statusCode: 400 }
            );
            const body = res.body as {
              message: string;
              attributes?: { errors?: Array<{ locationId: string; missingSpaces: string[] }> };
            };
            expect(body.message).toContain(
              'The following private locations are not available in all spaces this monitor is shared to'
            );
            expect(body.message).toContain(singleSpaceLocation.label);
            expect(Array.isArray(body.attributes?.errors)).toBe(true);
            expect(body.attributes?.errors?.[0]?.locationId).toBe(singleSpaceLocation.id);
            expect(body.attributes?.errors?.[0]?.missingSpaces).toStrictEqual([otherSpaceId]);

            await deleteMonitor(apiClient, created.id);
          }
        );
      }
    }
  );
};
