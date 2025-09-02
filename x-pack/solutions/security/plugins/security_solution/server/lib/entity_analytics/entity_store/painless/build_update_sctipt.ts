/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CRUDEntity } from '../../../../../common/api/entity_analytics/entity_store/entities';

const nestedFields = ['attributes', 'lifecycle', 'behavior'];
const immutableFields = ['id'];

export const buildUpdateEntityPainlessScript = (doc: CRUDEntity) => {
  let script = ``;
  // all defined attributes that are not nested
  const attributes = Object.keys(doc.entity).filter(
    (attr) =>
      immutableFields.indexOf(attr) < 0 &&
      nestedFields.indexOf(attr) < 0 &&
      notNullOrUndefined(getEntityVal(doc, attr))
  );

  // Add non nested fields
  attributes.forEach((attr) => {
    script += `ctx._source.entity['${attr}'] = ${convertToPainlessValue(getEntityVal(doc, attr))};`;
  });

  // Add nested fields
  nestedFields
    .filter((attr) => notNullOrUndefined(getEntityVal(doc, attr)))
    .forEach((attr) => {
      // init nested fields if not yet defined
      script += `ctx._source.entity['${attr}'] = ctx._source.entity['${attr}'] == null ? [:] : ctx._source.entity['${attr}'];`;

      Object.keys(getEntityVal(doc, attr) as object)
        .filter((subAttr) => notNullOrUndefined(getNestedEntityVal(doc, attr, subAttr)))
        .forEach((subAttr) => {
          script += `ctx._source.entity['${attr}']['${subAttr}'] = ${convertToPainlessValue(
            getNestedEntityVal(doc, attr, subAttr)
          )};`;
        });
    });

  return script;
};

function getEntityVal(doc: CRUDEntity, key: string) {
  return doc.entity[key as keyof typeof doc.entity];
}

function getNestedEntityVal(doc: CRUDEntity, key: string, nestedKey: string) {
  const nested = getEntityVal(doc, key);
  if (!(nested instanceof Object)) {
    return;
  }

  return nested[nestedKey as keyof typeof nested];
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
      throw new Error(`Can't convert ${typeof value} to a painless expression`);
  }
}

// used to guarantee that a value exists, false being part of it
function notNullOrUndefined(val: unknown) {
  return val !== undefined && val !== null;
}
