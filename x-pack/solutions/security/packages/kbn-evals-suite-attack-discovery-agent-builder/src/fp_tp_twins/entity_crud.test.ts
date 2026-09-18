/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENCODED_POWERSHELL_USER_ENTITY_ID } from './constants';
import { ENCODED_POWERSHELL_FP_ENTITIES, ENCODED_POWERSHELL_TP_ENTITIES } from './entities';
import { toEntityCrudRequest } from './entity_crud';

describe('toEntityCrudRequest', () => {
  const tpHost = ENCODED_POWERSHELL_TP_ENTITIES[0];
  const tpUser = ENCODED_POWERSHELL_TP_ENTITIES[1];
  const fpHost = ENCODED_POWERSHELL_FP_ENTITIES[0];

  it('returns host CRUD type for the workstation entity', () => {
    expect(toEntityCrudRequest(tpHost).entityType).toBe('host');
  });

  it('returns host.id as an array for Entity Store CRUD', () => {
    const host = toEntityCrudRequest(tpHost).body.host as { id?: string[] };
    expect(host.id).toEqual(['ad-scenario-host-wks-alice-01']);
  });

  it('returns generic CRUD type for the user entity', () => {
    expect(toEntityCrudRequest(tpUser).entityType).toBe('generic');
  });

  it('returns the authored user EUID on the generic entity body', () => {
    const entity = toEntityCrudRequest(tpUser).body.entity as { id?: string };
    expect(entity.id).toBe(ENCODED_POWERSHELL_USER_ENTITY_ID);
  });

  it('returns no host field on the generic user body', () => {
    expect(toEntityCrudRequest(tpUser).body.host).toBeUndefined();
  });

  it('returns mdm_management as the FP host sub_type', () => {
    const entity = toEntityCrudRequest(fpHost).body.entity as { sub_type?: string };
    expect(entity.sub_type).toBe('mdm_management');
  });
});
