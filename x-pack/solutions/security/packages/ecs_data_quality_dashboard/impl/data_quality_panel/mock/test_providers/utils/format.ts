/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

import { EMPTY_STAT } from '../../../constants';

const defaultBytesFormat = '0,0.[0]b';
export const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
export const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;
