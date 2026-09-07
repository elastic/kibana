/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DETAILS_REDIRECT_PATH } from '../constants';

export const buildAttackDetailPath = ({
  attackId,
  index,
  timestamp,
}: {
  attackId: string;
  index: string;
  timestamp?: string | null;
}) => {
  const timestampQuery = timestamp ? `&timestamp=${encodeURIComponent(timestamp)}` : '';
  return `${ATTACK_DETAILS_REDIRECT_PATH}/${encodeURIComponent(
    attackId
  )}?index=${encodeURIComponent(index)}${timestampQuery}`;
};
