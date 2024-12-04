/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';

export class RuleMigrationsStorage {
  private readonly storage = new Storage(localStorage);
  public key: string;

  constructor(private readonly objectName: string, spaceId?: string) {
    this.key = this.getStorageKey(spaceId);
  }

  private getStorageKey(spaceId: string = 'default') {
    return `siem_migrations.rules.${this.objectName}.${spaceId}`;
  }

  public setSpaceId(spaceId: string) {
    this.key = this.getStorageKey(spaceId);
  }

  public get = () => this.storage.get(this.key);
  public set = (value: string) => this.storage.set(this.key, value);
  public remove = () => this.storage.remove(this.key);
}
