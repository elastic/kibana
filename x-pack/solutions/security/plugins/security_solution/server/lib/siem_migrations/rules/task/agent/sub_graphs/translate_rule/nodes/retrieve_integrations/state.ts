/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { RuleMigrationIntegration } from '../../../../../../types';
import type { MigrationComment } from '../../../../../../../../../../common/siem_migrations/model/common.gen';

export const retrieveIntegrationsState = Annotation.Root({
  title: Annotation<string>(),
  description: Annotation<string>(),
  inline_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  nl_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  semantic_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  integration: Annotation<RuleMigrationIntegration | undefined>({
    reducer: (current, value) => value ?? current,
    default: () => undefined,
  }),
  comments: Annotation<MigrationComment[]>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
});

export type RetrieveIntegrationsState = typeof retrieveIntegrationsState.State;
