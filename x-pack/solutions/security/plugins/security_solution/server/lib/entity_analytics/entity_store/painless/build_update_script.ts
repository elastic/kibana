/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const immutableFields = [`entity.id`];

export const buildUpdateEntityPainlessScript = (props: Record<string, unknown>) => {
  let script = ``;

  const initializedProperties: Record<string, boolean> = {};

  for (const path of Object.keys(props)) {
    if (immutableFields.indexOf(path) >= 0) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const value = props[path];
    const splitPath = path.split('.');
    const fullPathAccess = convertToPainlessObjectAccess(splitPath);

    // init objects in painless
    for (let sliceSize = 1; sliceSize < splitPath.length; sliceSize++) {
      const subPath = convertToPainlessObjectAccess(splitPath.slice(0, sliceSize));
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

/*
ctx._source['host'] = ctx._source['host'] == null ? [:] : ctx._source['host'];
ctx._source['host']['name'] = ctx._source['host']['name'] == null ? [:] : ctx._source['host']['name'];
ctx._source['host']['name'] = 'not-allowed';
ctx._source['host']['id'] = ctx._source['host']['id'] == null ? [:] : ctx._source['host']['id'];
ctx._source['host']['id'] = ['123'];
ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];
ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];
ctx._source['entity']['attributes']['Privileged'] = ctx._source['entity']['attributes']['Privileged'] == null ? [:] : ctx._source['entity']['attributes']['Privileged'];
ctx._source['entity']['attributes']['Privileged'] = true;
ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];
ctx._source['entity']['lifecycle']['FirstSeen'] = ctx._source['entity']['lifecycle']['FirstSeen'] == null ? [:] : ctx._source['entity']['lifecycle']['FirstSeen'];
ctx._source['entity']['lifecycle']['FirstSeen'] = '1995-12-17T03:24:00';


*/
