/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { AttachmentFramework } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { SLOSuggestion } from '../../common/cases/suggestions';
import type { LazyWithContextProviders } from '../utils/get_lazy_with_context_providers';

export const registerSloSuggestion = (
  attachmentFramework: AttachmentFramework,
  lazyWithContextProviders: LazyWithContextProviders
) => {
  const LazyChild = lazy(() =>
    import('./suggestion_component').then((m) => ({
      default: m.SLOSuggestionChildren,
    }))
  );
  const WrappedWithProviders = lazyWithContextProviders(LazyChild);
  const children = lazy(() => Promise.resolve({ default: WrappedWithProviders }));

  attachmentFramework.registerSuggestion<SLOSuggestion>({
    id: 'slo',
    owner: 'observability',
    children,
  });
};
