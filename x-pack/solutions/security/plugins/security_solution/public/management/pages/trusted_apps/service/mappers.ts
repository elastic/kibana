/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateExceptionListItemSchema, OsType } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EffectScope, NewTrustedApp } from '../../../../../common/endpoint/types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../common/endpoint/service/artifacts/constants';
import { conditionEntriesToEntries } from '../../../../common/utils/exception_list_items';

type Mapping<T extends string, U> = { [K in T]: U };

const OPERATING_SYSTEM_TO_OS_TYPE: Mapping<OperatingSystem, OsType> = {
  [OperatingSystem.LINUX]: 'linux',
  [OperatingSystem.MAC]: 'macos',
  [OperatingSystem.WINDOWS]: 'windows',
};

const effectScopeToTags = (effectScope: EffectScope) => {
  if (effectScope.type === 'policy') {
    return effectScope.policies.map((policy) => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policy}`);
  } else {
    return [`${BY_POLICY_ARTIFACT_TAG_PREFIX}all`];
  }
};

/**
 * Map NewTrustedApp to CreateExceptionListItemOptions.
 */
export const newTrustedAppToCreateExceptionListItem = ({
  os,
  entries,
  name,
  description = '',
  effectScope,
}: NewTrustedApp): CreateExceptionListItemSchema => {
  return {
    comments: [],
    description,
    entries: conditionEntriesToEntries(entries, true),
    list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name,
    namespace_type: 'agnostic',
    os_types: [OPERATING_SYSTEM_TO_OS_TYPE[os]],
    tags: effectScopeToTags(effectScope),
    type: 'simple',
  };
};
