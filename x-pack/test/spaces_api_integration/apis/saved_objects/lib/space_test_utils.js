/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getUrlPrefix(urlContext) {
  return urlContext ? `/s/${urlContext}` : ``;
}

export function getIdPrefix(spaceId) {
  return spaceId === 'default' ? '' : `${spaceId}-`;
}

export function getExpectedSpaceIdProperty(spaceId) {
  if (spaceId === 'default') {
    return {};
  }
  return {
    spaceId
  };
}
