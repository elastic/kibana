/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { apiRoutes as fileApiRoutes } from '@kbn/files-plugin/public/files_client/files_client';
import { BaseFilesClient } from '@kbn/shared-ux-file-types';
import { superUser } from '../authentication/users';
import { User } from '../authentication/types';
import { getSpaceUrlPrefix } from './helpers';

export const downloadFile = async ({
  supertest,
  fileId,
  kind,
  mimeType,
  fileName,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  fileId: string;
  kind: string;
  mimeType: string;
  fileName: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<BaseFilesClient['download']> => {
  const result = await supertest
    .get(
      `${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getDownloadRoute(kind, fileId, fileName)}`
    )
    .set('accept', mimeType)
    .buffer()
    .expect(expectedHttpCode);

  return result;
};

export interface FileDescriptor {
  kind: string;
  id: string;
}

export const deleteFiles = async ({
  supertest,
  files,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  files: FileDescriptor[];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  await Promise.all(
    files.map(async (fileInfo) => {
      return await supertest
        .delete(
          `${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getDeleteRoute(
            fileInfo.kind,
            fileInfo.id
          )}`
        )
        .set('kbn-xsrf', 'true')
        .auth(auth.user.username, auth.user.password)
        .send()
        .expect(expectedHttpCode);
    })
  );
};

export const deleteAllFiles = async ({
  supertest,
  kind,
  auth = { user: superUser, space: null },
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  kind: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const files = await listFiles({ supertest, params: { kind }, auth, expectedHttpCode });

  await deleteFiles({
    supertest,
    files: files.files.map((fileInfo) => ({ kind, id: fileInfo.id })),
    auth,
    expectedHttpCode,
  });
};

export const getFileById = async ({
  supertest,
  id,
  kind,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  id: string;
  kind: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<BaseFilesClient['getById']> => {
  const { body } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getByIdRoute(kind, id)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return body;
};

export const listFiles = async ({
  supertest,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  params: Parameters<BaseFilesClient['list']>[0];
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<BaseFilesClient['list']> => {
  const { page, perPage, kind, ...rest } = params;

  const { body } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getListRoute(kind)}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .query({ page, perPage })
    .send(rest)
    .expect(expectedHttpCode);

  return body;
};

type CreateFileSchema = Omit<Parameters<BaseFilesClient['create']>[0], 'mimeType'> & {
  mimeType: string;
};

export const createFile = async ({
  supertest,
  params,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  params: CreateFileSchema;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<BaseFilesClient['create']> => {
  const { kind, ...rest } = params;
  const { body } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getCreateFileRoute(kind)}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(rest)
    .expect(expectedHttpCode);

  return body;
};

export const uploadFile = async ({
  supertest,
  data,
  kind,
  fileId,
  mimeType,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  data: string | object;
  kind: string;
  fileId: string;
  mimeType: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<BaseFilesClient['upload']> => {
  const { body } = await supertest
    .put(`${getSpaceUrlPrefix(auth.space)}${fileApiRoutes.getUploadRoute(kind, fileId)}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .set('Content-Type', mimeType)
    .send(data)
    .expect(expectedHttpCode);

  return body;
};

export const createAndUploadFile = async ({
  supertest,
  data,
  createFileParams,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  data: string | object;
  createFileParams: CreateFileSchema;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}) => {
  const createFileResult = await createFile({
    supertest,
    params: createFileParams,
    expectedHttpCode,
    auth,
  });

  const uploadFileResult = await uploadFile({
    supertest,
    data,
    fileId: createFileResult.file.id,
    mimeType: createFileParams.mimeType,
    kind: createFileParams.kind,
    auth,
  });

  return { create: createFileResult, upload: uploadFileResult };
};
