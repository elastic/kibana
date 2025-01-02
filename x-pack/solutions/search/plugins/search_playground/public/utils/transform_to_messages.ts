/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AIMessage,
  Message,
  MessageRole,
  UseChatHelpers,
  AnnotationDoc,
  AnnotationTokens,
} from '../types';
import { transformAnnotationToDoc } from './transform_annotation_to_doc';

export const transformFromChatMessages = (messages: UseChatHelpers['messages']): Message[] =>
  messages.map(({ id, content, createdAt, role, annotations = [] }) => {
    const commonMessageProp = {
      id,
      content,
      createdAt,
      role,
    };

    if (role === MessageRole.assistant) {
      return {
        ...commonMessageProp,
        citations: annotations
          .find((annotation): annotation is AnnotationDoc => annotation.type === 'citations')
          ?.documents?.map(transformAnnotationToDoc),
        retrievalDocs: annotations
          .find((annotation): annotation is AnnotationDoc => annotation.type === 'retrieved_docs')
          ?.documents?.map(transformAnnotationToDoc),
        inputTokens: {
          context: annotations?.find(
            (annotation): annotation is AnnotationTokens =>
              annotation.type === 'context_token_count'
          )?.count,
          total: annotations?.find(
            (annotation): annotation is AnnotationTokens => annotation.type === 'prompt_token_count'
          )?.count,
          contextClipped: annotations?.find(
            (annotation): annotation is AnnotationTokens => annotation.type === 'context_clipped'
          )?.count,
          searchQuery: annotations?.find(
            (annotation): annotation is AnnotationTokens => annotation.type === 'search_query'
          )?.question,
        },
      } as AIMessage;
    }

    return commonMessageProp;
  });
