/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import type { GeoEcs } from '@kbn/securitysolution-ecs';
import {
  unflattenObject,
  transformLocationFields,
} from '../../../../helpers/format_response_object_values';
import type {
  AutonomousSystem,
  NetworkHit,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getNetworkDetailsAgg = (type: string, networkHit: NetworkHit | {}) => {
  const autonomousSystem: AutonomousSystem | {} = getOr(
    {},
    `${type}.as`,
    unflattenObject(getOr({}, 'as.results.hits.hits[0].fields', networkHit))
  );

  const geoFields: GeoEcs | {} = getOr(
    {},
    `${type}.geo`,
    unflattenObject(
      transformLocationFields(getOr({}, 'geo.results.hits.hits[0].fields', networkHit))
    )
  );

  return {
    [type]: {
      autonomousSystem: {
        ...autonomousSystem,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};
