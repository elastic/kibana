/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { PolicySettings } from '../policy_settings';

export const CloudDefendFleetPolicyReplaceDefineStepExtension =
  memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
    ({ newPolicy, onChange }: PackagePolicyReplaceDefineStepExtensionComponentProps) => {
      const policy = JSON.parse(JSON.stringify(newPolicy));

      return <PolicySettings policy={policy} onChange={onChange} />;
    }
  );

CloudDefendFleetPolicyReplaceDefineStepExtension.displayName =
  'CloudDefendFleetPolicyReplaceDefineStepExtension';

// eslint-disable-next-line import/no-default-export
export { CloudDefendFleetPolicyReplaceDefineStepExtension as default };
