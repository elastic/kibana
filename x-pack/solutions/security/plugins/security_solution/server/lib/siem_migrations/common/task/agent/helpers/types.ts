/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type NodeHelper<I extends object, O extends object> = (input: I) => Promise<O>;
export type NodeHelperCreator<P extends object, I extends object, O extends object> = (
  params: P
) => NodeHelper<I, O>;
