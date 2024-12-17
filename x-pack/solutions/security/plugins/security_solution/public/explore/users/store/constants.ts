/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserAssetTableType } from './model';

export const USER_ASSET_TABLE_DEFAULTS_FIELDS = {
  [UserAssetTableType.assetOkta]: [
    'user.id',
    'user.profile.first_name',
    'user.profile.last_name',
    'user.profile.primaryPhone',
    'user.profile.mobile_phone',
    'user.profile.job_title',
    'user.geo.city_name',
    'user.geo.country_iso_code',
  ],
  [UserAssetTableType.assetEntra]: [
    'user.id',
    'user.first_name',
    'user.last_name',
    'user.phone',
    'user.job_title',
    'user.work.location_name',
  ],
};
