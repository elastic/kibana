/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../../../plugins/spaces/common/constants';

export function getUrlPrefix(spaceId) {
  return spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : ``;
}

export function getIdPrefix(spaceId) {
  return spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}-`;
}

export function getExpectedSpaceIdProperty(spaceId) {
  if (spaceId === DEFAULT_SPACE_ID) {
    return {};
  }
  return {
    spaceId
  };
}
