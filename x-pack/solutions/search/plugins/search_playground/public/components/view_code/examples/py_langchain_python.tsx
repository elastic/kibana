/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FieldErrors } from 'react-hook-form';
import { PlaygroundForm, PlaygroundFormFields } from '../../../types';
import { Prompt } from '../../../../common/prompt';
import { elasticsearchQueryObject } from '../../../utils/user_query';
import { getESQuery } from './utils';

export const getSourceFields = (sourceFields: PlaygroundForm['source_fields']) => {
  let hasContentFieldsArray = false;
  const fields: Record<string, string | string[]> = {};
  for (const indexName of Object.keys(sourceFields)) {
    if (sourceFields[indexName].length > 1) {
      fields[indexName] = sourceFields[indexName];
      hasContentFieldsArray = true;
    } else {
      fields[indexName] = sourceFields[indexName][0];
    }
  }
  return {
    hasContentFieldsArray,
    sourceFields: JSON.stringify(fields, null, 4),
  };
};

export const LangchainPythonExmaple = ({
  formValues,
  formErrors,
  clientDetails,
}: {
  formValues: PlaygroundForm;
  formErrors: FieldErrors<PlaygroundForm>;
  clientDetails: string;
}) => {
  const { esQuery, hasContentFieldsArray, indices, prompt, sourceFields } = useMemo(() => {
    const fields = getSourceFields(formValues.source_fields);
    return {
      esQuery: getESQuery(
        elasticsearchQueryObject(
          formValues.elasticsearch_query,
          formValues.user_elasticsearch_query,
          formErrors[PlaygroundFormFields.userElasticsearchQuery]
        )
      ),
      indices: formValues.indices.join(','),
      prompt: Prompt(formValues.prompt, {
        context: true,
        citations: formValues.citations,
        type: 'openai',
      }),
      ...fields,
    };
  }, [formValues, formErrors]);
  return (
    <EuiCodeBlock language="py" isCopyable overflowHeight="100%">
      {`## Install the required packages
## pip install -qU elasticsearch langchain langchain-elasticsearch langchain-openai

from elasticsearch import Elasticsearch
from langchain_elasticsearch import ElasticsearchRetriever
from langchain_openai import ChatOpenAI${
        hasContentFieldsArray ? '\nfrom langchain_core.documents import Document' : ''
      }
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import format_document
from langchain.prompts.prompt import PromptTemplate
import os
${clientDetails}

def build_query(query):
    return ${esQuery}

index_source_fields = ${sourceFields}
${
  hasContentFieldsArray
    ? `
def context_document_mapper(hit):
    content = ""
    content_fields = index_source_fields[hit["_index"]]
    for field in content_fields:
        if field in hit["_source"] and hit["_source"][field]:
            field_content = hit["_source"][field]
            content += f"{field}: {field_content}\\n"
    return Document(page_content=content, metadata=hit)\n\n`
    : ''
}
retriever = ElasticsearchRetriever(
    index_name="${indices}",
    body_func=build_query,
    ${
      hasContentFieldsArray
        ? 'document_mapper=context_document_mapper,'
        : 'content_field=index_source_fields,'
    }
    es_client=es_client
)

model = ChatOpenAI(openai_api_key=os.environ["OPENAI_API_KEY"], model_name="gpt-3.5-turbo")

ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """${prompt}"""
)

DEFAULT_DOCUMENT_PROMPT = PromptTemplate.from_template(template="{page_content}")

def _combine_documents(
    docs, document_prompt=DEFAULT_DOCUMENT_PROMPT, document_separator="\\n\\n"
):
    doc_strings = [format_document(doc, document_prompt) for doc in docs]
    return document_separator.join(doc_strings)

_context = {
    "context": retriever | _combine_documents,
    "question": RunnablePassthrough(),
}

chain = _context | ANSWER_PROMPT | model | StrOutputParser()
ans = chain.invoke("What is it you want to ask the LLM?")
print("---- Answer ----")
print(ans)`}
    </EuiCodeBlock>
  );
};
