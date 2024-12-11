/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { threat_subtechniques } from '../threat_subtechnique';

export const threat_technique_id = t.string;
export const threat_technique_name = t.string;
export const threat_technique_reference = t.string;

export const threat_technique = t.intersection([
  t.exact(
    t.type({
      id: threat_technique_id,
      name: threat_technique_name,
      reference: threat_technique_reference,
    })
  ),
  t.exact(
    t.partial({
      subtechnique: threat_subtechniques,
    })
  ),
]);
export const threat_techniques = t.array(threat_technique);

export type ThreatTechnique = t.TypeOf<typeof threat_technique>;
