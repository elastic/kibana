/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationsStorage } from '../../common/service/storage';

export class DashboardMigrationsStorage<T> extends SiemMigrationsStorage<T> {
  protected getKey(spaceId: string = 'default'): string {
    if (this.options?.customKey) {
      return this.options.customKey;
    }

    const prefix = this.scope ? `siem_migrations.${this.scope}` : 'siem_migrations';

    return `${prefix}.${this.objectName}.${spaceId}`;
  }
}
