/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BlastRadiusEntityKey {
  /** The ECS field the term was aggregated on, e.g. `host.name`. */
  field: string;
  /** The aggregated term, e.g. `web-1`. */
  value: string;
}

/**
 * How one blast radius entity is identified — by the **pair**, never by the value alone.
 *
 * `host.name`/`web-1` and `user.name`/`web-1` are two different entities: one is a machine and the
 * other is an account that happens to share its name. Collapsing them would draw a single chip that
 * filtered the queue by two unrelated things.
 *
 * An ECS field name never contains a colon, so the first colon always separates the two halves and a
 * value that contains colons of its own (an IPv6 address) cannot collide with another pair.
 */
export const getBlastRadiusEntityId = ({ field, value }: BlastRadiusEntityKey): string =>
  `${field}:${value}`;
