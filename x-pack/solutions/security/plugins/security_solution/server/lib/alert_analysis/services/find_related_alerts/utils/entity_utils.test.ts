/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractSourceEntitiesFromAlert,
  getEntityFieldValues,
  trimEntityValues,
} from './entity_utils';
import { RELATED_ALERT_ENTITY_LIST_MAX_LENGTH } from '../../../../../../common/api/alert_analysis/related_alerts';

describe('entity_utils', () => {
  it('reads nested ECS host.name values', () => {
    const entities = extractSourceEntitiesFromAlert({
      host: { name: 'nested-host' },
    });

    expect(entities.hostNames).toEqual(['nested-host']);
  });

  it('reads dotted ECS field names when present on the document', () => {
    expect(getEntityFieldValues({ 'host.name': 'flat-host' }, 'host.name')).toEqual(['flat-host']);
  });

  it('caps merged entity values at RELATED_ALERT_ENTITY_LIST_MAX_LENGTH', () => {
    const values = Array.from({ length: RELATED_ALERT_ENTITY_LIST_MAX_LENGTH + 5 }, (_, i) =>
      String(i)
    );

    expect(trimEntityValues(values)).toHaveLength(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH);
  });
});
