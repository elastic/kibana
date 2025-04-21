/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const LazyAssetInventoryReplaceDefineStepExtension = lazy(
  () => import('./policy_template_form')
);

// export const LazyAssetInventoryReplaceDefineStepExtension = lazy(async () => {
//   const AssetPolicyTemplateForm = await import('./policy_template_form');
//   return {
//     default: AssetPolicyTemplateForm,
//   };
// });
