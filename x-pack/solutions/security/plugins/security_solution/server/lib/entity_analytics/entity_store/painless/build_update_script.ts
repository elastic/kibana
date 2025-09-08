/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenProps } from '../utils/flatten_props';

const immutableFields = [`['entity']['id']`];

export const buildUpdateEntityPainlessScript = (props: FlattenProps[]) => {
  let script = ``;

  const initializedProperties: Record<string, boolean> = {};

  for (let i = 0; i < props.length; i++) {
    const { path, value } = props[i];

    const fullPathAccess = convertToPainlessObjectAccess(path);
    if (immutableFields.indexOf(fullPathAccess) >= 0) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // init objects in painless
    for (let sliceSize = 1; sliceSize < path.length; sliceSize++) {
      const subPath = convertToPainlessObjectAccess(path.slice(0, sliceSize));
      if (!initializedProperties[subPath as keyof typeof initializedProperties]) {
        const subPathAccess = `ctx._source${subPath}`;
        script += `${subPathAccess} = ${subPathAccess} == null ? [:] : ${subPathAccess};`;
        initializedProperties[subPath as keyof typeof initializedProperties] = true;
      }
    }

    script += `ctx._source${fullPathAccess} = ${convertToPainlessValue(value)};`;
  }

  return script;
};

function convertToPainlessObjectAccess(path: string[]) {
  return path.map((s) => `['${s}']`).join('');
}

function convertToPainlessValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return `'${value.replaceAll(`'`, `\\'`)}'`; // scape strings
    case 'number':
    case 'bigint':
    case 'boolean':
      return `${value}`;
    default:
      if (Array.isArray(value)) {
        return `[${value.map((item) => convertToPainlessValue(item)).join(', ')}]`;
      }
      throw new Error(`Can't convert ${typeof value} to a painless expression`);
  }
}
