/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a Proxy in which certain property accesses are redirected to
 * replacement factories.
 *
 * @param target the object to proxy
 * @param replacements a map of keys to replacement factories
 * @returns a proxy of the object
 */
export const createPropertyGetProxy = <Target extends object, Key extends keyof Target>(
  target: Target,
  replacements: {
    [key in Key]: (value: Target[Key]) => Target[Key];
  }
) =>
  new Proxy(target, {
    get(accessedTarget, accessedKey, ...rest) {
      const value = Reflect.get(accessedTarget, accessedKey, ...rest) as Target[Key];
      if (hasKey(replacements, accessedKey)) {
        return replacements[accessedKey](value);
      } else {
        return value;
      }
    },
  });

const hasKey = <T extends object, K extends keyof T>(
  obj: T,
  key: string | number | symbol
): key is K => Object.hasOwn(obj, key);
