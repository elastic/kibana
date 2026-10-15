/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userHasEntityStoreStopPrivileges } from './user_has_entity_store_stop_privileges';
import { ENGINE_DESCRIPTOR_CREATE_PRIVILEGE } from '@kbn/entity-store/common';

describe('userHasEntityStoreStopPrivileges', () => {
  it('returns false when privileges are undefined', () => {
    expect(userHasEntityStoreStopPrivileges(undefined)).toBe(false);
  });

  it('returns false when install_privileges.kibana is missing', () => {
    expect(
      userHasEntityStoreStopPrivileges({
        has_all_required: false,
        privileges: { elasticsearch: {}, kibana: {} },
      })
    ).toBe(false);
  });

  it('returns true when engine descriptor create is authorized', () => {
    expect(
      userHasEntityStoreStopPrivileges({
        has_all_required: false,
        has_install_permissions: false,
        privileges: { elasticsearch: {}, kibana: {} },
        install_privileges: {
          elasticsearch: {},
          kibana: {
            [ENGINE_DESCRIPTOR_CREATE_PRIVILEGE]: true,
          },
        },
      })
    ).toBe(true);
  });

  it('returns false when engine descriptor create is not authorized', () => {
    expect(
      userHasEntityStoreStopPrivileges({
        has_all_required: false,
        has_install_permissions: false,
        privileges: { elasticsearch: {}, kibana: {} },
        install_privileges: {
          elasticsearch: {},
          kibana: {
            [ENGINE_DESCRIPTOR_CREATE_PRIVILEGE]: false,
          },
        },
      })
    ).toBe(false);
  });
});
