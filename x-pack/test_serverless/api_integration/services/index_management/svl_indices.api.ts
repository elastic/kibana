/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from './constants';
import { RoleCredentials } from '../../../shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SvlIndicesApi({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const executeActionOnIndices =
    (roleAuthc: RoleCredentials) =>
    async ({
      index,
      urlParam,
      args,
    }: {
      index?: string | string[];
      urlParam: string;
      args?: any;
    }) => {
      const indices = Array.isArray(index) ? index : [index];

      return await supertestWithoutAuth
        .post(`${API_BASE_PATH}/indices/${urlParam}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({ indices, ...args });
    };

  const closeIndex = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'close' });

  const openIndex = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'open' });

  const deleteIndex = async (roleAuthc: RoleCredentials, index?: string) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'delete' });

  const flushIndex = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'flush' });

  const refreshIndex = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'refresh' });

  const forceMerge = async (
    index: string,
    roleAuthc: RoleCredentials,
    args?: { maxNumSegments: number }
  ) => await executeActionOnIndices(roleAuthc)({ index, urlParam: 'forcemerge', args });

  const unfreeze = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'unfreeze' });

  const clearCache = async (index: string, roleAuthc: RoleCredentials) =>
    await executeActionOnIndices(roleAuthc)({ index, urlParam: 'clear_cache' });

  const list = async (roleAuthc: RoleCredentials) =>
    supertestWithoutAuth
      .get(`${API_BASE_PATH}/indices`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const reload = async (roleAuthc: RoleCredentials, indexNames?: string[]) =>
    await supertestWithoutAuth
      .post(`${API_BASE_PATH}/indices/reload`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send({ indexNames });

  return {
    closeIndex,
    openIndex,
    deleteIndex,
    flushIndex,
    refreshIndex,
    forceMerge,
    unfreeze,
    list,
    reload,
    clearCache,
  };
}
