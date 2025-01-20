/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecursivePartial } from '@elastic/charts';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { sloEditLocatorID } from '@kbn/observability-plugin/common';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { CreateSLOInput } from '@kbn/slo-schema';
import { SLO_CREATE_PATH } from '../../common/locators/paths';

export type SloEditLocatorParams = RecursivePartial<CreateSLOInput>;

export class SloEditLocatorDefinition implements LocatorDefinition<SloEditLocatorParams> {
  public readonly id = sloEditLocatorID;

  public readonly getLocation = async (slo: SloEditLocatorParams) => {
    if (!!slo.id) {
      return {
        app: 'slo',
        path: `/edit/${encodeURIComponent(slo.id)}`,
        state: {},
      };
    }

    return {
      app: 'slo',
      path: setStateToKbnUrl<RecursivePartial<CreateSLOInput>>(
        '_a',
        slo,
        { useHash: false, storeInHashQuery: false },
        SLO_CREATE_PATH
      ),
      state: {},
    };
  };
}
