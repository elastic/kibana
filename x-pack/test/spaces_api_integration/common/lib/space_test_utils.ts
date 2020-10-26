/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';

export function getUrlPrefix(spaceId?: string) {
  return spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : ``;
}

export function getIdPrefix(spaceId?: string) {
  return spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}-`;
}

export function getTestScenariosForSpace(spaceId: string) {
  const explicitScenario = {
    spaceId,
    urlPrefix: `/s/${spaceId}`,
    scenario: `when referencing the ${spaceId} space explicitly in the URL`,
  };

  if (spaceId === DEFAULT_SPACE_ID) {
    return [
      {
        spaceId,
        urlPrefix: ``,
        scenario: 'when referencing the default space implicitly',
      },
      explicitScenario,
    ];
  }

  return [explicitScenario];
}
