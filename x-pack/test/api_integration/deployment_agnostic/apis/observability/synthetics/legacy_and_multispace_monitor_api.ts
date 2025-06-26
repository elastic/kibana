/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  syntheticsMonitorSavedObjectType,
  legacySyntheticsMonitorTypeSingle,
} from '@kbn/synthetics-plugin/common/types/saved_objects';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('LegacyAndMultiSpaceMonitorAPI', function () {
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    let editorUser: RoleCredentials;

    const saveMonitor = async (monitor: any, type: string, spaceId?: string) => {
      let url = SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `?internal=true&savedObjectType=${type}`;
      if (spaceId) {
        url = `/s/${spaceId}${url}`;
        monitor.spaces = [spaceId];
      }
      const res = await supertest
        .post(url)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);
      expect(res.status).eql(200, JSON.stringify(res.body));
      return res.body;
    };

    const editMonitor = async (monitorId: string, monitor: any, type: string, spaceId?: string) => {
      let url = SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}?internal=true`;
      if (spaceId) {
        url = `/s/${spaceId}${url}`;
      }
      const res = await supertest
        .put(url)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);
      expect(res.status).eql(200, JSON.stringify(res.body));
      return res.body;
    };

    const deleteMonitor = async (monitorId: string, type: string, spaceId?: string) => {
      let url = SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`;
      if (spaceId) {
        url = `/s/${spaceId}${url}`;
      }
      const res = await supertest
        .delete(url)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send();
      expect(res.status).eql(200, JSON.stringify(res.body));
      return res.body;
    };

    let legacyMonitor: any;
    let multiMonitor: any;
    let uuid: string;
    let httpMonitor: any;
    let editedLegacy: any;
    let editedMulti: any;
    let delLegacy: any;
    let delMulti: any;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(() => {
      uuid = uuidv4();
      httpMonitor = getFixtureJson('http_monitor');
    });

    describe('Legacy and Multi-space monitor CRUD', () => {
      it('should create a legacy monitor', async () => {
        legacyMonitor = await saveMonitor(
          { ...httpMonitor, name: `legacy-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        expect(legacyMonitor.name).eql(`legacy-${uuid}`);
        await kibanaServer.savedObjects
          .find({
            type: legacySyntheticsMonitorTypeSingle,
          })
          .then((response) => {
            expect(response.saved_objects.length).to.eql(1);
            expect(response.saved_objects[0].id).to.eql(legacyMonitor.id);
          });
      });

      it('should create a multi-space monitor', async () => {
        multiMonitor = await saveMonitor(
          { ...httpMonitor, name: `multi-${uuid}` },
          syntheticsMonitorSavedObjectType
        );
        expect(multiMonitor.name).eql(`multi-${uuid}`);
        const response = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found = response.saved_objects.find((obj: any) => obj.id === multiMonitor.id);
        expect(found).not.to.be(undefined);
        expect(found?.attributes.name).to.eql(`multi-${uuid}`);
      });

      it('should edit a legacy monitor', async () => {
        if (!legacyMonitor) {
          legacyMonitor = await saveMonitor(
            { ...httpMonitor, name: `legacy-${uuid}` },
            legacySyntheticsMonitorTypeSingle
          );
        }
        editedLegacy = await editMonitor(
          legacyMonitor.id,
          { name: `legacy-edited-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        expect(editedLegacy.name).eql(`legacy-edited-${uuid}`);
        const response = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const found = response.saved_objects.find((obj: any) => obj.id === legacyMonitor.id);
        expect(found).not.to.be(undefined);
        expect(found?.attributes.name).to.eql(`legacy-edited-${uuid}`);
      });

      it('should edit a multi-space monitor', async () => {
        if (!multiMonitor) {
          multiMonitor = await saveMonitor(
            { ...httpMonitor, name: `multi-${uuid}` },
            syntheticsMonitorSavedObjectType
          );
        }
        editedMulti = await editMonitor(
          multiMonitor.id,
          { name: `multi-edited-${uuid}` },
          syntheticsMonitorSavedObjectType
        );
        expect(editedMulti.name).eql(`multi-edited-${uuid}`);
        const response = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found = response.saved_objects.find((obj: any) => obj.id === multiMonitor.id);
        expect(found).not.to.be(undefined);
        expect(found?.attributes.name).to.eql(`multi-edited-${uuid}`);
      });

      it('should delete a legacy monitor', async () => {
        if (!legacyMonitor) {
          legacyMonitor = await saveMonitor(
            { ...httpMonitor, name: `legacy-${uuid}` },
            legacySyntheticsMonitorTypeSingle
          );
        }
        delLegacy = await deleteMonitor(legacyMonitor.id, legacySyntheticsMonitorTypeSingle);
        expect(delLegacy[0].id).eql(legacyMonitor.id);
        const response = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const found = response.saved_objects.find((obj: any) => obj.id === legacyMonitor.id);
        expect(found).to.be(undefined);
      });

      it('should delete a multi-space monitor', async () => {
        if (!multiMonitor) {
          multiMonitor = await saveMonitor(
            { ...httpMonitor, name: `multi-${uuid}` },
            syntheticsMonitorSavedObjectType
          );
        }
        delMulti = await deleteMonitor(multiMonitor.id, syntheticsMonitorSavedObjectType);
        expect(delMulti[0].id).eql(multiMonitor.id);
        const response = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found = response.saved_objects.find((obj: any) => obj.id === multiMonitor.id);
        expect(found).to.be(undefined);
      });

      it('should allow editing spaces of a legacy monitor (convert to multi-space type)', async () => {
        const legacy = await saveMonitor(
          { ...httpMonitor, name: `legacy-to-multi-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        const NEW_SPACE = `edit-space-${uuid}`;
        await kibanaServer.spaces.create({ id: NEW_SPACE, name: `Edit Space ${uuid}` });

        await editMonitor(
          legacy.id,
          { spaces: ['default', NEW_SPACE], name: `legacy-now-multi-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );

        const multiRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const foundMulti = multiRes.saved_objects.find((obj: any) => obj.id === legacy.id);
        expect(foundMulti).not.to.be(undefined);
        expect(foundMulti?.attributes.name).to.eql(`legacy-now-multi-${uuid}`);
        expect(foundMulti?.namespaces?.includes(NEW_SPACE)).to.be(true);

        const legacyRes = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const foundLegacy = legacyRes.saved_objects.find((obj: any) => obj.id === legacy.id);
        expect(foundLegacy).to.be(undefined);

        await deleteMonitor(legacy.id, syntheticsMonitorSavedObjectType);
      });

      it('should allow editing spaces of a multi-space monitor', async () => {
        const multi = await saveMonitor(
          { ...httpMonitor, name: `multi-edit-spaces-${uuid}` },
          syntheticsMonitorSavedObjectType
        );
        const SPACE1 = `multi-space1-${uuid}`;
        const SPACE2 = `multi-space2-${uuid}`;
        await kibanaServer.spaces.create({ id: SPACE1, name: `Multi Space 1 ${uuid}` });
        await kibanaServer.spaces.create({ id: SPACE2, name: `Multi Space 2 ${uuid}` });

        await editMonitor(
          multi.id,
          { spaces: ['default', SPACE1, SPACE2], name: `multi-edited-spaces-${uuid}` },
          syntheticsMonitorSavedObjectType
        );

        const multiRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found = multiRes.saved_objects.find((obj: any) => obj.id === multi.id);
        expect(found).not.to.be(undefined);
        expect(found?.attributes.name).to.eql(`multi-edited-spaces-${uuid}`);
        expect(found?.namespaces?.includes(SPACE1)).to.be(true);
        expect(found?.namespaces?.includes(SPACE2)).to.be(true);

        await editMonitor(
          multi.id,
          { spaces: ['default', SPACE2], name: `multi-edited-spaces2-${uuid}` },
          syntheticsMonitorSavedObjectType
        );
        const multiRes2 = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found2 = multiRes2.saved_objects.find((obj: any) => obj.id === multi.id);
        expect(found2?.namespaces?.includes(SPACE1)).to.be(false);
        expect(found2?.namespaces?.includes(SPACE2)).to.be(true);

        await deleteMonitor(multi.id, syntheticsMonitorSavedObjectType);
      });

      it('should delete a monitor after editing spaces', async () => {
        const legacy = await saveMonitor(
          { ...httpMonitor, name: `legacy-del-after-edit-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        const DEL_SPACE = `del-space-${uuid}`;
        await kibanaServer.spaces.create({ id: DEL_SPACE, name: `Del Space ${uuid}` });
        await editMonitor(
          legacy.id,
          { spaces: ['default', DEL_SPACE], name: `legacy-del-multi-${uuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        const del = await deleteMonitor(legacy.id, syntheticsMonitorSavedObjectType);
        expect(del[0].id).eql(legacy.id);
        const multiRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        const found = multiRes.saved_objects.find((obj: any) => obj.id === legacy.id);
        expect(found).to.be(undefined);
      });
    });

    describe('Multi-space monitor filtering', () => {
      let monitorDefault: any;
      let monitorSpace: any;
      let legacyMonitorSpace: any;
      let SPACE_ID: string;

      beforeEach(async () => {
        uuid = uuidv4();
        SPACE_ID = `test-space-${uuid}`;
        await kibanaServer.spaces.create({ id: SPACE_ID, name: `Test Space ${uuid}` });
        monitorDefault = await saveMonitor(
          { ...httpMonitor, name: `default-${uuid}` },
          syntheticsMonitorSavedObjectType
        );
        monitorSpace = await saveMonitor(
          { ...httpMonitor, name: `space-${uuid}` },
          syntheticsMonitorSavedObjectType,
          SPACE_ID
        );
        legacyMonitorSpace = await saveMonitor(
          { ...httpMonitor, name: `legacy-space-${uuid}` },
          legacySyntheticsMonitorTypeSingle,
          SPACE_ID
        );
      });

      it('should filter all monitors (showFromAllSpaces)', async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '?showFromAllSpaces=true&perPage=1000')
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const found = res.body.monitors.filter((m: any) =>
          [monitorDefault.id, monitorSpace.id, legacyMonitorSpace.id].includes(m.id)
        );
        expect(found.length).eql(3);

        // Assert all monitors exist in their respective spaces
        const defaultRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });
        expect(defaultRes.saved_objects.some((obj: any) => obj.id === monitorDefault.id)).to.be(
          true
        );

        const spaceRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
          space: SPACE_ID,
        });
        expect(spaceRes.saved_objects.some((obj: any) => obj.id === monitorSpace.id)).to.be(true);

        const legacySpaceRes = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
          space: SPACE_ID,
        });
        expect(
          legacySpaceRes.saved_objects.some((obj: any) => obj.id === legacyMonitorSpace.id)
        ).to.be(true);
      });
    });

    describe('Monitor search by name', () => {
      let legacyMonitorSearch: any;
      let multiMonitorSearch: any;
      let searchUuid: string;

      beforeEach(async () => {
        searchUuid = uuidv4();
        // Create a legacy monitor with a unique name
        legacyMonitorSearch = await saveMonitor(
          { ...httpMonitor, name: `legacy-search-${searchUuid}` },
          legacySyntheticsMonitorTypeSingle
        );
        // Create a multi-space monitor with a unique name
        multiMonitorSearch = await saveMonitor(
          { ...httpMonitor, name: `multi-search-${searchUuid}` },
          syntheticsMonitorSavedObjectType
        );
      });

      it('should find both legacy and multi-space monitors by name', async () => {
        const searchName = `search-${searchUuid}`;
        const res = await supertest
          .get(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS +
              `?query=${encodeURIComponent(searchName)}&perPage=1000`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());

        expect(res.status).eql(200, JSON.stringify(res.body));

        // Should find both monitors by partial name match
        const foundLegacy = res.body.monitors.find(
          (m: any) => m.id === legacyMonitorSearch.id && m.name === `legacy-search-${searchUuid}`
        );
        const foundMulti = res.body.monitors.find(
          (m: any) => m.id === multiMonitorSearch.id && m.name === `multi-search-${searchUuid}`
        );
        expect(foundLegacy).not.to.be(undefined);
        expect(foundMulti).not.to.be(undefined);
      });
    });

    describe('Monitor space validation', () => {
      it('should throw error if spaces list does not include the calling space on create', async () => {
        const INVALID_SPACE = `invalid-space-${uuidv4()}`;
        await kibanaServer.spaces.create({ id: INVALID_SPACE, name: `Invalid Space` });
        const monitorData = {
          ...getFixtureJson('http_monitor'),
          name: `invalid-create-${uuidv4()}`,
          spaces: ['default'],
        };
        const resp = await supertest
          .post(`/s/${INVALID_SPACE}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}?internal=true`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitorData);

        expect(resp.status).to.be(400);
        expect(resp.body.message).to.eql(
          'Invalid space ID provided in monitor configuration. It should always include the current space ID.'
        );
      });

      it('should throw error if spaces list does not include the calling space on edit', async () => {
        const EDIT_SPACE = `edit-space-${uuidv4()}`;
        await kibanaServer.spaces.create({ id: EDIT_SPACE, name: `Edit Space` });
        // Create monitor in EDIT_SPACE
        const res = await supertest
          .post(
            `/s/${EDIT_SPACE}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}?internal=true&savedObjectType=${syntheticsMonitorSavedObjectType}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            ...getFixtureJson('http_monitor'),
            name: `edit-invalid-${uuidv4()}`,
            spaces: [EDIT_SPACE],
          });
        expect(res.status).eql(200, JSON.stringify(res.body));
        // Try to edit monitor with spaces not including EDIT_SPACE
        const resp = await supertest
          .put(
            `/s/${EDIT_SPACE}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${res.body.id}?internal=true`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ name: `edit-invalid-${uuidv4()}`, spaces: ['default'] });

        expect(resp.status).to.be(400);
        expect(resp.body.message).to.eql(
          'Invalid space ID provided in monitor configuration. It should always include the current space ID.'
        );
      });
    });
  });
}
