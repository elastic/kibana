/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';

export const getLabel = ({
  baseLabel,
  riskScore,
}: {
  baseLabel: string;
  riskScore: number | null | undefined;
}): string => (riskScore != null ? `${baseLabel} ${i18n.RISK_LABEL(riskScore)}` : baseLabel);
