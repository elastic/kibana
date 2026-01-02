/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Document } from '@langchain/core/documents';
import {
  ChatPromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  createUIMessageStream,
  JsonToSseTransformStream,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';
import { toUIMessageStream } from '@ai-sdk/langchain';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import type { ChatMessage, ElasticsearchRetrieverContentField } from '../types';
import { ElasticsearchRetriever } from './elasticsearch_retriever';
import { renderTemplate } from '../utils/render_template';

import type { AssistClient } from '../utils/assist';
import { getCitations } from '../utils/get_citations';
import { getTokenEstimate, getTokenEstimateFromMessages } from './token_tracking';
import { ContextLimitError } from './errors';
import { ContextModelLimitError } from '../../common';

interface RAGOptions {
  index: string;
  retriever: (question: string) => object;
  doc_context?: string;
  hit_doc_mapper?: (hit: SearchHit) => Document;
  content_field: ElasticsearchRetrieverContentField;
  size?: number;
  inputTokensLimit?: number;
}

interface ConversationalChainOptions {
  model: BaseLanguageModel;
  prompt: string;
  questionRewritePrompt: string;
  rag?: RAGOptions;
}

interface ContextInputs {
  context: string;
  chat_history: string;
  question: string;
}

const getSerialisedMessages = (chatHistory: BaseMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message instanceof HumanMessage) {
      return `Human: ${message.content}`;
    } else if (message instanceof AIMessage) {
      return `Assistant: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join('\n');
};

export const getMessages = (chatHistory: ChatMessage[]) => {
  return chatHistory
    .map((message) => {
      if (message.role === 'human') {
        return new HumanMessage(message.content);
      } else if (message.role === 'assistant') {
        return new AIMessage(message.content);
      }
      return null;
    })
    .filter((message): message is BaseMessage => message !== null);
};

const buildContext = (docs: Document[]) => {
  const serializedDocs = docs.map((doc, i) =>
    renderTemplate(
      `
position: ${i + 1}
{pageContent}`,
      {
        pageContent: doc.pageContent,
        ...doc.metadata,
      }
    )
  );
  return serializedDocs.join('\n');
};

const messageContentToString = (content: BaseMessage['content']): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (typeof part === 'object' && part !== null) {
          if ('text' in part && typeof part.text === 'string') {
            return part.text;
          }
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
};

const isAIMessageChunk = (chunk: any): chunk is AIMessageChunk => {
  return Boolean(
    chunk &&
      typeof chunk === 'object' &&
      'constructor' in chunk &&
      (chunk as { constructor: { name?: string } }).constructor?.name === 'AIMessageChunk'
  );
};

export function contextLimitCheck(
  modelLimit: number | undefined,
  prompt: ChatPromptTemplate
): (input: ContextInputs) => Promise<ContextInputs> {
  return async (input) => {
    if (!modelLimit) return input;

    const stringPrompt = await prompt.format(input);
    const approxPromptTokens = getTokenEstimate(stringPrompt);
    const aboveContextLimit = approxPromptTokens > modelLimit;

    if (aboveContextLimit) {
      throw new ContextLimitError(ContextModelLimitError, modelLimit, approxPromptTokens);
    }

    return input;
  };
}

interface RetrievedDocumentsAnnotation {
  type: 'retrieved_docs';
  documents: Document[];
}

interface CitationsAnnotation {
  type: 'citations';
  documents: Document[];
}

type PlaygroundAnnotation =
  | RetrievedDocumentsAnnotation
  | CitationsAnnotation
  | { type: 'context_token_count'; count: number }
  | { type: 'prompt_token_count'; count: number }
  | { type: 'search_query'; question: string };

interface PlaygroundDataTypes {
  [key: string]: unknown;
  message_annotations: PlaygroundAnnotation[];
}

type PlaygroundUIMessage = UIMessage<unknown, PlaygroundDataTypes>;
type PlaygroundStreamWriter = UIMessageStreamWriter<PlaygroundUIMessage>;

const writeAnnotations = (
  writer: PlaygroundStreamWriter,
  annotations: PlaygroundAnnotation | PlaygroundAnnotation[]
) => {
  const data = Array.isArray(annotations) ? annotations : [annotations];
  writer.write({
    type: 'data-message_annotations',
    data,
  });
};

export function registerContextTokenCounts(writer: PlaygroundStreamWriter) {
  return (input: ContextInputs) => {
    writeAnnotations(writer, {
      type: 'context_token_count',
      count: getTokenEstimate(input.context),
    });

    return input;
  };
}

class ConversationalChainFn {
  options: ConversationalChainOptions;

  constructor(options: ConversationalChainOptions) {
    this.options = options;
  }

  async stream(client: AssistClient, msgs: ChatMessage[]): Promise<ReadableStream<string>> {
    const uiStream = createUIMessageStream<PlaygroundUIMessage>({
      execute: async ({ writer }) => {
        const messages = msgs ?? [];
        const lcMessages = getMessages(messages);
        const previousMessages = lcMessages.slice(0, -1);
        const lastMessageContent = lcMessages[lcMessages.length - 1]?.content;
        const question = messageContentToString(lastMessageContent ?? '');
        const retrievedDocs: Document[] = [];
        let hasWrittenCitations = false;

        let retrievalChain: Runnable = RunnableLambda.from(() => '');
        const chatHistory = getSerialisedMessages(previousMessages);

        if (this.options.rag) {
          const retriever = new ElasticsearchRetriever({
            retriever: this.options.rag.retriever,
            index: this.options.rag.index,
            client: client.getClient(),
            content_field: this.options.rag.content_field,
            hit_doc_mapper: this.options.rag.hit_doc_mapper ?? undefined,
            k: this.options.rag.size ?? 3,
          });

          retrievalChain = retriever.pipe(buildContext);
        }

        let standaloneQuestionChain: Runnable = RunnableLambda.from((input) => {
          return input.question;
        });

        if (lcMessages.length > 1) {
          const questionRewritePromptTemplate = PromptTemplate.fromTemplate(
            this.options.questionRewritePrompt
          );
          standaloneQuestionChain = RunnableSequence.from([
            {
              context: (input) => input.chat_history,
              question: (input) => input.question,
            },
            questionRewritePromptTemplate,
            this.options.model,
            new StringOutputParser(),
          ]).withConfig({
            metadata: {
              type: 'standalone_question',
            },
          });
        }

        const prompt = ChatPromptTemplate.fromMessages([
          SystemMessagePromptTemplate.fromTemplate(this.options.prompt),
          ...lcMessages,
        ]);

        const answerChain = RunnableSequence.from([
          {
            context: RunnableSequence.from([(input) => input.question, retrievalChain]),
            question: (input) => input.question,
          },
          RunnableLambda.from((inputs) => {
            writeAnnotations(writer, {
              type: 'search_query',
              question: inputs.question,
            });
            return inputs;
          }),
          RunnableLambda.from(contextLimitCheck(this.options?.rag?.inputTokensLimit, prompt)),
          RunnableLambda.from(registerContextTokenCounts(writer)),
          prompt,
          this.options.model.withConfig({ metadata: { type: 'question_answer_qa' } }),
        ]);

        const conversationalRetrievalQAChain = RunnableSequence.from([
          {
            question: standaloneQuestionChain,
            chat_history: (input) => input.chat_history,
          },
          answerChain,
        ]);

        const lcStream = await conversationalRetrievalQAChain.stream(
          {
            question,
            chat_history: chatHistory,
          },
          {
            callbacks: [
              {
                // callback for chat based models (OpenAI)
                handleChatModelStart(
                  llm,
                  msg: BaseMessage[][],
                  runId,
                  parentRunId,
                  extraParams,
                  tags,
                  metadata: Record<string, string>
                ) {
                  if (metadata?.type === 'question_answer_qa') {
                    writeAnnotations(writer, [
                      {
                        type: 'prompt_token_count',
                        count: getTokenEstimateFromMessages(msg),
                      },
                      {
                        type: 'search_query',
                        question,
                      },
                    ]);
                  }
                },
                // callback for prompt based models (Bedrock uses ActionsClientLlm)
                handleLLMStart(llm, input, runId, parentRunId, extraParams, tags, metadata) {
                  if (metadata?.type === 'question_answer_qa') {
                    writeAnnotations(writer, {
                      type: 'prompt_token_count',
                      count: getTokenEstimate(input[0]),
                    });
                  }
                },
                handleRetrieverEnd(documents) {
                  retrievedDocs.push(...documents);
                  writeAnnotations(writer, {
                    type: 'retrieved_docs',
                    documents,
                  });
                },
                handleChainEnd(outputs) {
                  if (hasWrittenCitations || !isAIMessageChunk(outputs)) {
                    return;
                  }
                  hasWrittenCitations = true;
                  writeAnnotations(writer, {
                    type: 'citations',
                    documents: getCitations(outputs.content as string, 'inline', retrievedDocs),
                  });
                },
              },
            ],
          }
        );

        writer.merge(toUIMessageStream(lcStream));
      },
      onError: (error: unknown) => {
        if (error instanceof Error) {
          return error.message;
        }
        return 'An error occurred while processing the request';
      },
    });

    return uiStream.pipeThrough(new JsonToSseTransformStream());
  }
}

export function ConversationalChain(options: ConversationalChainOptions): ConversationalChainFn {
  return new ConversationalChainFn(options);
}
