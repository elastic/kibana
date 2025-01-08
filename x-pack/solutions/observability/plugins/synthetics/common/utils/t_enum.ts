/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * This utility function can be used to turn a TypeScript enum into a io-ts codec.
 *
 * @example
 * import { PathReporter } from "io-ts/lib/PathReporter";
 *
 * enum Thing {
 *  FOO = "foo",
 *  BAR = "bar"
 * }
 *
 * const ThingCodec = tEnum<Thing>("Thing", Thing);
 *
 * console.log(PathReporter.report(ThingCodec.decode('invalidvalue')));
 * // prints [ 'Invalid value "invalidvalue" supplied to : Thing' ]
 * console.log(PathReporter.report(ThingCodec.decode('foo')));
 * // prints [ 'No errors!' ]
 */
export function tEnum<EnumType>(enumName: string, theEnum: Record<string, string | number>) {
  const isEnumValue = (input: unknown): input is EnumType =>
    Object.values<unknown>(theEnum).includes(input);

  return new t.Type<EnumType>(
    enumName,
    isEnumValue,
    (input, context) => (isEnumValue(input) ? t.success(input) : t.failure(input, context)),
    t.identity
  );
}
