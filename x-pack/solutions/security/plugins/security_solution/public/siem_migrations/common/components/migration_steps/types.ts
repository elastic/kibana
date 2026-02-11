/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../common/siem_migrations/model/common.gen';

export type UploadedLookups = Record<string, string>;
export type AddUploadedLookups = (lookups: SiemMigrationResourceData[]) => void;
