/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';

const storages = {
  local: new Storage(localStorage),
  session: new Storage(sessionStorage),
} as const;

interface Options {
  customKey?: string;
  storageType?: keyof typeof storages;
}

export class MigrationsStorage<T> {
  private readonly storage: Storage;
  public key: string;

  constructor(private readonly objectName: string, private readonly options?: Options) {
    this.storage = storages[this.options?.storageType ?? 'local'];
    this.key = this.getKey();
  }

  private getKey(spaceId: string = 'default'): string {
    if (this.options?.customKey) {
      return this.options.customKey;
    }
    // Previously, we use this class to store rules migrations settings only and now it will be a common storage for all kind of migrations.
    // We can keep the `*.rules.*` as part of this key to make sure that previously stored settings are not lost and users can continue using them.
    return `siem_migrations.rules.${this.objectName}.${spaceId}`;
  }

  public setSpaceId(spaceId: string) {
    this.key = this.getKey(spaceId);
  }

  public get = (): T | undefined => this.storage.get(this.key);
  public set = (value: T) => this.storage.set(this.key, value);
  public remove = () => this.storage.remove(this.key);
}
