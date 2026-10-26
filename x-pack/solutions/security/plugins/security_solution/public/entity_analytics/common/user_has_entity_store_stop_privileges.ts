/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENGINE_DESCRIPTOR_CREATE_PRIVILEGE } from '@kbn/entity-store/common';
import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics';

/**
 * Stop updates engine descriptors as the requesting user, so it needs SO write on
 * entity-engine-descriptor-v2 (Security `all`). That is a subset of install privileges —
 * missing ES manage/cluster does not block stop.
 *
 * Privilege key comes from `@kbn/entity-store/common` so it stays aligned with
 * `AssetManagerClient.getPrivileges` / the SO type registration.
 */
export const userHasEntityStoreStopPrivileges = (privileges?: EntityAnalyticsPrivileges): boolean =>
  privileges?.install_privileges?.kibana?.[ENGINE_DESCRIPTOR_CREATE_PRIVILEGE] === true;
