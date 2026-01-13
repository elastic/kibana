/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { rulesLocatorID, type RulesLocatorParams } from '@kbn/deeplinks-observability';
import { RULES_PATH } from '../../common/locators/paths';

export class RulesLocatorDefinition implements LocatorDefinition<RulesLocatorParams> {
  public readonly id = rulesLocatorID;

  public readonly getLocation = async ({
    lastResponse = [],
    params = {},
    search = '',
    status = [],
    type = [],
  }: RulesLocatorParams) => {
    return {
      app: 'observability',
      path: setStateToKbnUrl(
        '_a',
        {
          lastResponse,
          params,
          search,
          status,
          type,
        },
        { useHash: false, storeInHashQuery: false },
        RULES_PATH
      ),
      state: {},
    };
  };
}
