/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchProps } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';

export const getEbtLabelProps = (
  ebt: Parameters<typeof getEbtProps>[0]
): EuiSwitchProps['labelProps'] => ({ 'data-test-subj': undefined, ...getEbtProps(ebt) });
