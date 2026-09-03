/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGateDefinitionByGateId } from '@kbn/pnd-common';

/**
 * The queue / chat row verb for `gateId`, read from `gate.actionLabel`.
 *
 * Fail-closed: a gate the registry does not know yields no label, so the row
 * renders no action rather than a guessed "Approve".
 */
export const actionLabel = (gateId: string): string | undefined =>
  getGateDefinitionByGateId(gateId)?.actionLabel;
