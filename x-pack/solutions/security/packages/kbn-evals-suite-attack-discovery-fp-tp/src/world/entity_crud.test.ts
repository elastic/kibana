/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEncodedPowershellEntities,
  getEncodedPowershellIds,
} from '../scenarios/encoded_powershell';
import { toEntityCrudRequest } from './entity_crud';

describe('toEntityCrudRequest', () => {
  const [tpHost, tpUser] = buildEncodedPowershellEntities('tp');
  const [fpHost] = buildEncodedPowershellEntities('fp');
  const ids = getEncodedPowershellIds();

  it('returns host CRUD type for the workstation entity', () => {
    expect(toEntityCrudRequest(tpHost).entityType).toBe('host');
  });

  it('returns host.id as an array for Entity Store CRUD', () => {
    const host = toEntityCrudRequest(tpHost).body.host as { id?: string[] };
    expect(host.id).toEqual([ids.hostId]);
  });

  it('returns generic CRUD type for the user entity', () => {
    expect(toEntityCrudRequest(tpUser).entityType).toBe('generic');
  });

  it('returns the authored user EUID on the generic entity body', () => {
    const entity = toEntityCrudRequest(tpUser).body.entity as { id?: string };
    expect(entity.id).toBe(ids.userEntityId);
  });

  it('returns no host field on the generic user body', () => {
    expect(toEntityCrudRequest(tpUser).body.host).toBeUndefined();
  });

  it('returns the user name and host id as identity fields for the user entity', () => {
    expect(toEntityCrudRequest(tpUser).identityFields).toEqual({
      user: { name: 'alice.chen', domain: 'CONTOSO' },
      host: { name: 'wks-alice-01', id: ids.hostId },
    });
  });

  it('returns no identity fields for a host entity', () => {
    expect(toEntityCrudRequest(tpHost).identityFields).toBeUndefined();
  });

  it('returns mdm_management as the FP host sub_type', () => {
    const entity = toEntityCrudRequest(fpHost).body.entity as { sub_type?: string };
    expect(entity.sub_type).toBe('mdm_management');
  });
});
