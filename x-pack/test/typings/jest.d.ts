/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare namespace jest {
  function fn(): Mock;
  function fn<T, Y extends any[]>(implementation?: (...args: Y) => T): Mock<T, Y>;

  type RejectedValue<T> = T extends PromiseLike<any> ? any : never;
  type ResolvedValue<T> = T extends PromiseLike<infer U> ? U | T : never;

  interface Mock<T = any, Y extends any[] = any> extends Function, MockInstance<T, Y> {
    new (...args: Y): T;
    (...args: Y): T;
  }

  interface MockInstance<T, Y extends any[]> {
    getMockName(): string;
    mock: MockContext<T, Y>;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    getMockImplementation(): (...args: Y) => T | undefined;
    mockImplementation(fn?: (...args: Y) => T): this;
    mockImplementationOnce(fn: (...args: Y) => T): this;
    mockName(name: string): this;
    mockReturnThis(): this;
    mockReturnValue(value: T): this;
    mockReturnValueOnce(value: T): this;
    mockResolvedValue(value: ResolvedValue<T>): this;
    mockResolvedValueOnce(value: ResolvedValue<T>): this;
    mockRejectedValue(value: RejectedValue<T>): this;
    mockRejectedValueOnce(value: RejectedValue<T>): this;
  }

  interface MockResultReturn<T> {
    type: 'return';
    value: T;
  }

  interface MockResultIncomplete {
    type: 'incomplete';
    value: undefined;
  }

  interface MockResultThrow {
    type: 'throw';
    value: any;
  }

  type MockResult<T> = MockResultReturn<T> | MockResultThrow | MockResultIncomplete;

  interface MockContext<T, Y extends any[]> {
    calls: Y[];
    instances: T[];
    invocationCallOrder: number[];
    results: Array<MockResult<T>>;
  }
}
