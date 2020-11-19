/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('space attributes', () => {
    it('should allow a space to be created with a mixed-case hex color code', async () => {
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'xxx')
        .send({
          id: 'api-test-space',
          name: 'api test space',
          disabledFeatures: [],
          color: '#aaBB78',
        })
        .expect(200, {
          id: 'api-test-space',
          name: 'api test space',
          disabledFeatures: [],
          color: '#aaBB78',
        });
    });

    it('should allow a space to be created with an avatar image', async () => {
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'xxx')
        .send({
          id: 'api-test-space2',
          name: 'Space with image',
          disabledFeatures: [],
          color: '#cafeba',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAB3klEQVRYR+2WzUrDQBCARzwqehE8ir1WPfgqRRA1bePBXgpe/MGCB9/Aiw+j+ASCB6kotklaEwW1F0WwNSaps9lV69awGzBpDzt8pJP9mXxsmk3ABH2oUEIilJAIJSRCCYlQQiKUkIh4QgY5agZodVjBowFrBktWQzDBU2ykiYaDuQpCYgnl3QunGzM6Z6YF+b5SkcgK1UH/aLbYReQiYL9d9/o+XFop5IU0Vl4uapAzoXC3eEBPw9vH1/wT6Vs2otPSkoH/IZzlzO/TU2vgQm8nl69Hp0H7nZ4OXogLJSSKBIUC3w88n+Ueyfv56fVZnqCQNVnCHbLrkV0Gd2d+GNkglsk438dhaTxloZDutV4wb06Vf40JcWZ2sMttPpE8NaHGeBnzIAhwPXqHseVB11EyLD0hxLUeaYud2a3B0g3k7GyFtrhX7F2RqhC+yV3jgTb2Rqdqf7/kUxYiWBOlTtXxfPJEtc8b5thGb+8AhL4ohnCNqQjZ2T2+K5rnw2M6KwEhKNDSGM3pTdxjhDgLbHkw/v/zw4AiPuSsfMzAiTidKxiF/ArpFqyzK8SMOlkwvloUMYRCtNvZLWeuIomd2Za/WZS4QomjhEQoIRFKSIQSEqGERAyfEH4YDBFQ/ARU6BiBxCAIQQAAAABJRU5ErkJggg==',
        })
        .expect(200, {
          id: 'api-test-space2',
          name: 'Space with image',
          disabledFeatures: [],
          color: '#cafeba',
          imageUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTnU1rJkAAAB3klEQVRYR+2WzUrDQBCARzwqehE8ir1WPfgqRRA1bePBXgpe/MGCB9/Aiw+j+ASCB6kotklaEwW1F0WwNSaps9lV69awGzBpDzt8pJP9mXxsmk3ABH2oUEIilJAIJSRCCYlQQiKUkIh4QgY5agZodVjBowFrBktWQzDBU2ykiYaDuQpCYgnl3QunGzM6Z6YF+b5SkcgK1UH/aLbYReQiYL9d9/o+XFop5IU0Vl4uapAzoXC3eEBPw9vH1/wT6Vs2otPSkoH/IZzlzO/TU2vgQm8nl69Hp0H7nZ4OXogLJSSKBIUC3w88n+Ueyfv56fVZnqCQNVnCHbLrkV0Gd2d+GNkglsk438dhaTxloZDutV4wb06Vf40JcWZ2sMttPpE8NaHGeBnzIAhwPXqHseVB11EyLD0hxLUeaYud2a3B0g3k7GyFtrhX7F2RqhC+yV3jgTb2Rqdqf7/kUxYiWBOlTtXxfPJEtc8b5thGb+8AhL4ohnCNqQjZ2T2+K5rnw2M6KwEhKNDSGM3pTdxjhDgLbHkw/v/zw4AiPuSsfMzAiTidKxiF/ArpFqyzK8SMOlkwvloUMYRCtNvZLWeuIomd2Za/WZS4QomjhEQoIRFKSIQSEqGERAyfEH4YDBFQ/ARU6BiBxCAIQQAAAABJRU5ErkJggg==',
        });
    });

    it('creating a space with an invalid image fails', async () => {
      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'xxx')
        .send({
          id: 'api-test-space3',
          name: 'Space with invalid image',
          disabledFeatures: [],
          color: '#cafeba',
          imageUrl: 'invalidImage',
        })
        .expect(400, {
          error: 'Bad Request',
          message: "[request body.imageUrl]: must start with 'data:image'",
          statusCode: 400,
        });
    });
  });
}
