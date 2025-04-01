/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const PrivateLocationAttributesCodec = t.intersection([
  t.interface({
    label: t.string,
    id: t.string,
    agentPolicyId: t.string,
    isServiceManaged: t.boolean,
  }),
  t.partial({
    tags: t.array(t.string),
    geo: t.interface({
      lat: t.number,
      lon: t.number,
    }),
    namespace: t.string,
    spaces: t.array(t.string),
  }),
]);

export const SyntheticsPrivateLocationsAttributesCodec = t.type({
  locations: t.array(PrivateLocationAttributesCodec),
});

export type PrivateLocationAttributes = t.TypeOf<typeof PrivateLocationAttributesCodec>;
export type SyntheticsPrivateLocationsAttributes = t.TypeOf<
  typeof SyntheticsPrivateLocationsAttributesCodec
>;
