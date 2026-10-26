/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getAttackAlertIds } from '../../utils/get_attack_alert_ids';

/**
 * Memoized {@link getAttackAlertIds}: the de-obfuscated, de-duplicated original alert IDs for the
 * attack represented by `hit`.
 */
export const useAttackAlertIds = (hit: DataTableRecord): string[] =>
  useMemo(() => getAttackAlertIds(hit), [hit]);
