/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest: SuperTest<any> = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');

  const expect403 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 403);
  };

  const expectResponse = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  async function saveAdvancedSetting(username: string, password: string, spaceId?: string) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return await supertest
      .post(`${basePath}/api/kibana/settings`)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .send({ changes: { 'csv:quoteValues': null } })
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function saveTelemetrySetting(username: string, password: string, spaceId?: string) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return await supertest
      .post(`${basePath}/api/telemetry/v2/optIn`)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .send({ enabled: true })
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  describe('feature controls', () => {
    it(`settings can be saved with the advancedSettings: ["all"] feature privilege`, async () => {
      const username = 'settings_all';
      const roleName = 'settings_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                advancedSettings: ['all'],
              },
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        const regularSettingResult = await saveAdvancedSetting(username, password);
        expectResponse(regularSettingResult);

        const telemetryResult = await saveTelemetrySetting(username, password);
        expectResponse(telemetryResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it(`settings cannot be saved with the advancedSettings: ["read"] feature privilege`, async () => {
      const username = 'settings_read';
      const roleName = 'settings_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        const regularSettingResult = await saveAdvancedSetting(username, password);
        expect403(regularSettingResult);

        const telemetryResult = await saveTelemetrySetting(username, password);
        expect403(telemetryResult);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has dashboard all access to space_1 and dashboard read access to space_2
      const space1Id = 'space_1';
      const space2Id = 'space_2';
      const space3Id = 'space_3';

      const roleName = 'user_1';
      const username = 'user_1';
      const password = 'user_1-password';

      before(async () => {
        await spaces.create({
          id: space1Id,
          name: space1Id,
          disabledFeatures: [],
        });
        await spaces.create({
          id: space2Id,
          name: space2Id,
          disabledFeatures: [],
        });
        await spaces.create({
          id: space3Id,
          name: space3Id,
          disabledFeatures: [],
        });
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                advancedSettings: ['all'],
              },
              spaces: [space1Id],
            },
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: [space2Id],
            },
            {
              feature: {
                dashboard: ['read'],
              },
              spaces: [space3Id],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
        });
      });

      after(async () => {
        await spaces.delete(space1Id);
        await spaces.delete(space2Id);
        await spaces.delete(space3Id);
        await security.role.delete(roleName);
        await security.user.delete(username);
      });

      it('user_1 can save settings and telemetry in space_1', async () => {
        const regularSettingResult = await saveAdvancedSetting(username, password, space1Id);
        expectResponse(regularSettingResult);

        const telemetryResult = await saveTelemetrySetting(username, password, space1Id);
        expectResponse(telemetryResult);
      });

      it(`user_1 can only save telemetry in space_2`, async () => {
        const regularSettingResult = await saveAdvancedSetting(username, password, space2Id);
        expect403(regularSettingResult);

        const telemetryResult = await saveTelemetrySetting(username, password, space2Id);
        expectResponse(telemetryResult);
      });

      it(`user_1 can't save either settings or telemetry in space_3`, async () => {
        const regularSettingResult = await saveAdvancedSetting(username, password, space3Id);
        expect403(regularSettingResult);

        const telemetryResult = await saveTelemetrySetting(username, password, space3Id);
        expect403(telemetryResult);
      });
    });
  });
}
