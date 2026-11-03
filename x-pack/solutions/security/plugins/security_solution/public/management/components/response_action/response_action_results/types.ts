/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTextProps } from '@elastic/eui';
import type { ActionDetails, MaybeImmutable } from '../../../../../common/endpoint/types';

export interface ResponseActionResultsProps {
  action: MaybeImmutable<ActionDetails>;
  /** The agent id to display the result for. If undefined, the output for ALL agents will be displayed */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}
