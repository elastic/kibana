/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionType } from '@kbn/cases-plugin/public';
import { lazy } from 'react';
import type { AttachmentFramework } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { SLOSuggestion } from '../../common/cases/suggestions';
import type { LazyWithContextProviders } from '../utils/get_lazy_with_context_providers';

export const registerSloSuggestion = (
  attachmentFramework: AttachmentFramework,
  lazyWithContextProviders: LazyWithContextProviders
) => {
  const lazySuggestionComponent = lazy(() =>
    import('./suggestion_component').then((m) => ({
      default: m.SLOSuggestionChildren,
    }))
  );

  const SuggestionWithProviders = lazyWithContextProviders(lazySuggestionComponent);
  const LazySuggestionWithProviders = lazy(() =>
    Promise.resolve({ default: SuggestionWithProviders })
  );

  const sloSuggestionDefinition: SuggestionType<SLOSuggestion> = {
    id: 'slo',
    owner: 'observability',
    children: LazySuggestionWithProviders,
  };
  attachmentFramework.registerSuggestion(sloSuggestionDefinition);
};
