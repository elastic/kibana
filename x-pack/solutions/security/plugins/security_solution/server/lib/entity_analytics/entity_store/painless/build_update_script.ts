/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescription } from '../installation/types';
import { isFieldMissingOrEmpty } from './is_field_missing_or_empty';

const immutableFields = [`entity.id`];

export const buildUpdateEntityPainlessScript = (
  fieldDescriptions: Record<string, FieldDescription & { value: unknown }>
) => {
  let script = ``;

  const initializedProperties: Record<string, boolean> = {};
  let collectMapHasBeenInitialized = false;

  for (const [path, field] of Object.entries(fieldDescriptions)) {
    if (immutableFields.includes(path)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const splitPath = path.split('.');
    const painlessObjectAccess = convertToPainlessObjectAccess(splitPath);

    // init objects in painless
    for (let sliceSize = 1; sliceSize < splitPath.length; sliceSize++) {
      const subPath = convertToPainlessObjectAccess(splitPath.slice(0, sliceSize));
      if (!initializedProperties[subPath as keyof typeof initializedProperties]) {
        const subPathAccess = `ctx._source${subPath}`;
        script += `${subPathAccess} = ${subPathAccess} == null ? [:] : ${subPathAccess};`;
        initializedProperties[subPath as keyof typeof initializedProperties] = true;
      }
    }

    if (field.retention.operation === 'collect_values' && !collectMapHasBeenInitialized) {
      script += 'def collectMap = [:];';
      collectMapHasBeenInitialized = true;
    }

    script += getAssignmentStatement(painlessObjectAccess, path, field);
  }

  return script;
};

function getAssignmentStatement(
  painlessObjectAccess: string,
  path: string,
  { value, retention }: FieldDescription & { value: unknown }
) {
  let script = '';
  if (retention.operation === 'collect_values') {
    const ctxField = `ctx._source${painlessObjectAccess}`;
    const setOperation = Array.isArray(value) ? 'addAll' : 'add';
    const tmpSet = `collectMap['${path}']`;
    const maxLength = retention.maxLength;

    // We are not using a big string template to avoid adding line breaks
    // (for consistency with the rest of script);
    script += `${tmpSet} = new HashSet();`;
    script += `${tmpSet}.${setOperation}(${convertToPainlessValue(value)});`;
    script += `if (!(${isFieldMissingOrEmpty(ctxField)})) {`;
    script += `  if(${ctxField} instanceof Collection) {`;
    script += `    ${tmpSet}.addAll(${ctxField});`;
    script += `  } else {`;
    script += `    ${tmpSet}.add(${ctxField});`;
    script += `  }`;
    script += `}`;
    script += `${ctxField} = new ArrayList(${tmpSet}).subList(0, (int) Math.min(${maxLength}, ${tmpSet}.size()));`;
  } else {
    script = `ctx._source${painlessObjectAccess} = ${convertToPainlessValue(value)};`;
  }

  return script;
}

function convertToPainlessObjectAccess(path: string[]) {
  return path.map((s) => `['${s}']`).join('');
}

function convertToPainlessValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return `'${value.replaceAll(`'`, `\\'`)}'`; // escape strings
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
