/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { ADDITIONAL_CHARGES_MESSAGE } from '../../upselling/translations';

export const AdditionalChargesMessage: React.FC = () => {
  return (
    <div>
      <EuiText>{ADDITIONAL_CHARGES_MESSAGE}</EuiText>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default AdditionalChargesMessage;
