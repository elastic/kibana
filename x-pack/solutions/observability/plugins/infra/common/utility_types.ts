/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Pick2<T, K1 extends keyof T, K2 extends keyof T[K1]> = {
  [P1 in K1]: { [P2 in K2]: T[K1][P2] };
};
export type Pick3<T, K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]> = {
  [P1 in K1]: { [P2 in K2]: { [P3 in K3]: T[K1][K2][P3] } };
};

export type MandatoryProperty<T, Prop extends keyof T> = T & {
  [prop in Prop]-?: NonNullable<T[Prop]>;
};

/**
 * Portions of below code are derived from https://github.com/tycho01/typical
 * under the MIT License
 *
 * Copyright (c) 2017 Thomas Crockett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

export type DeepPartial<T> = T extends any[]
  ? DeepPartialArray<T[number]>
  : T extends object
  ? DeepPartialObject<T>
  : T;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeepPartialArray<T> extends Array<DeepPartial<T>> {}

type DeepPartialObject<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

export type ObjectValues<T> = Array<T[keyof T]>;

export type ObjectEntry<T> = [keyof T, T[keyof T]];
export type ObjectEntries<T> = Array<ObjectEntry<T>>;

export type UnwrapPromise<T extends Promise<any>> = T extends Promise<infer Value> ? Value : never;
