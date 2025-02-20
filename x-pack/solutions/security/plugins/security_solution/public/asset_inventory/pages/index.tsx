/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Onboarding } from '../components/onboarding';
import { AllAssets } from './all_assets';

const AssetsPage = () => {
  return (
    <Onboarding>
      <AllAssets />
    </Onboarding>
  );
};

AssetsPage.displayName = 'AssetsPage';

// eslint-disable-next-line import/no-default-export
export default AssetsPage;
