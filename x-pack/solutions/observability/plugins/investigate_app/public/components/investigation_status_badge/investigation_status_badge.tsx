/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { InvestigationResponse } from '@kbn/investigation-shared';
import React from 'react';
import { statusToColor } from '../investigation_edit_form/fields/status_field';

interface Props {
  status: InvestigationResponse['status'];
}

export function InvestigationStatusBadge({ status }: Props) {
  return <EuiBadge color={statusToColor[status]}>{status}</EuiBadge>;
}
