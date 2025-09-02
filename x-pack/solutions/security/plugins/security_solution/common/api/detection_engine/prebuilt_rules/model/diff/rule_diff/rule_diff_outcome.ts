/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleDiffOutcome<T> = {
  [Field in keyof T]: RuleDiffField;
};

export interface RuleDiffField {
  is_equal: boolean;
}

export type FieldsComparatorsFor<TObject> = Required<{
  [Field in keyof TObject]: FieldComparator<TObject[Field]>;
}>;

export type FieldComparator<T> = (a: T, b: T) => boolean;
