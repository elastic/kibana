/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LRUCache } from 'lru-cache';
import hash from 'object-hash';
export interface IHashedCache<KeyType, ValueType> {
  get(key: KeyType): ValueType | undefined;
  set(key: KeyType, value: ValueType): boolean;
  has(key: KeyType): boolean;
  reset(): void;
}

export class HashedCache<KeyType extends hash.NotUndefined, ValueType extends {}>
  implements IHashedCache<KeyType, ValueType>
{
  private cache: LRUCache<string, ValueType>;

  constructor(options: LRUCache.Options<string, ValueType, unknown> = { max: 500 }) {
    this.cache = new LRUCache<string, ValueType>(options);
  }

  public get(key: KeyType): ValueType | undefined {
    const serializedKey = hash(key);
    return this.cache.get(serializedKey);
  }

  public set(key: KeyType, value: ValueType) {
    const serializedKey = hash(key);
    this.cache.set(serializedKey, value);
    return this.cache.has(serializedKey);
  }

  public has(key: KeyType): boolean {
    const serializedKey = hash(key);
    return this.cache.has(serializedKey);
  }

  public reset() {
    return this.cache.clear();
  }
}
