/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpApiTagOperation } from '@kbn/cases-plugin/common/constants/types';
import type { FileKind } from '@kbn/files-plugin/common';
import type { FilesSetup } from '@kbn/files-plugin/server';

export const CASES_TEST_FIXTURE_OWNER = 'casesTestFixtureOwner';
export const CASES_TEST_FIXTURE_FILE_KIND_ID = `${CASES_TEST_FIXTURE_OWNER}_file_kind_id`;

const buildFileKind = (): FileKind => {
  return {
    id: CASES_TEST_FIXTURE_FILE_KIND_ID,
    http: fileKindHttpTags(),
    allowedMimeTypes: ['image/png'],
  };
};

const fileKindHttpTags = (): FileKind['http'] => {
  return {
    create: buildTag(HttpApiTagOperation.Create),
    download: buildTag(HttpApiTagOperation.Read),
    getById: buildTag(HttpApiTagOperation.Read),
    list: buildTag(HttpApiTagOperation.Read),
  };
};

const access = 'access:';

const buildTag = (operation: HttpApiTagOperation) => {
  return {
    tags: [`${access}${CASES_TEST_FIXTURE_OWNER}${operation}`],
  };
};

export const registerCaseFixtureFileKinds = (filesSetupPlugin: FilesSetup) => {
  const fileKind = buildFileKind();
  filesSetupPlugin.registerFileKind(fileKind);
};
