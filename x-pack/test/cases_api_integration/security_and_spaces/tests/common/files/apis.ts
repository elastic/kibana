/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OWNERS } from '@kbn/cases-plugin/common/constants';
import { FILES_API_ROUTES } from '@kbn/files-plugin/server/routes/api_routes';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

interface FileDescriptor {
  kind: string;
  id: string;
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  const deleteFiles = async (files: FileDescriptor[]) => {
    await Promise.all(
      files.map((fileInfo) => {
        supertest
          .delete(
            FILES_API_ROUTES.fileKind.getDeleteRoute(fileInfo.kind).replace('{id}', fileInfo.id)
          )
          .send()
          .expect(200);
      })
    );
  };

  describe('files', () => {
    describe('delete', () => {
      for (const plugin of OWNERS) {
        it(`should create and delete a file for plugin: ${plugin}`, async () => {
          const createResult = await supertest
            .post(FILES_API_ROUTES.fileKind.getCreateFileRoute(plugin))
            .set('kbn-xsrf', 'true')
            .send({
              name: 'testFile',
              alt: 'a test file',
              meta: {},
              mimeType: 'image/png',
            })
            .expect(200);

          await deleteFiles([{ kind: plugin, id: createResult.body.file.id }]);
        });
      }
    });

    describe('upload', () => {
      const filesToDelete: FileDescriptor[] = [];

      after(async () => {
        await deleteFiles(filesToDelete);
      });

      for (const plugin of OWNERS) {
        it(`should upload a file for plugin: ${plugin}`, async () => {
          const createResult = await supertest
            .post(FILES_API_ROUTES.fileKind.getCreateFileRoute(plugin))
            .set('kbn-xsrf', 'true')
            .send({
              name: 'testFile',
              alt: 'a test file',
              meta: {},
              mimeType: 'image/png',
            })
            .expect(200);

          filesToDelete.push({ kind: plugin, id: createResult.body.file.id });

          const uploadRoute = FILES_API_ROUTES.fileKind
            .getUploadRoute(plugin)
            .replace('{id}', createResult.body.file.id);

          const uploadResult = await supertest
            .put(uploadRoute)
            .set('Content-Type', 'image/png')
            .set('kbn-xsrf', 'true')
            .send('abc')
            .expect(200);

          expect(uploadResult.body.ok).to.be(true);
          expect(uploadResult.body.size).to.be(3);
        });
      }
    });
  });
};
