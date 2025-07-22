/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';
import { FieldErrors } from 'react-hook-form';
import { PlaygroundForm, PlaygroundFormFields } from '../../../types';
import { Prompt } from '../../../../common/prompt';
import { elasticsearchQueryObject } from '../../../utils/user_query';
import { getESQuery } from './utils';

export const PY_LANG_CLIENT = (
  formValues: PlaygroundForm,
  formErrors: FieldErrors<PlaygroundForm>,
  clientDetails: string
) => (
  <EuiCodeBlock language="py" isCopyable overflowHeight="100%">
    {`## Install the required packages
## pip install -qU elasticsearch openai

import os
from elasticsearch import Elasticsearch
from openai import OpenAI

${clientDetails}

openai_client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
)

index_source_fields = ${JSON.stringify(formValues.source_fields, null, 4)}

def get_elasticsearch_results(query):
    es_query = ${getESQuery({
      ...elasticsearchQueryObject(
        formValues.elasticsearch_query,
        formValues.user_elasticsearch_query,
        formErrors[PlaygroundFormFields.userElasticsearchQuery]
      ),
      size: formValues.doc_size,
    })}

    result = es_client.search(index="${formValues.indices.join(',')}", body=es_query)
    return result["hits"]["hits"]

def create_openai_prompt(results):
    context = ""
    for hit in results:
        ## For semantic_text matches, we need to extract the text from the highlighted field
        if "highlight" in hit:
            highlighted_texts = []
            for values in hit["highlight"].values():
                highlighted_texts.extend(values)
            context += "\\n --- \\n".join(highlighted_texts)
        else:
            context_fields = index_source_fields.get(hit["_index"])
            for source_field in context_fields:
                hit_context = hit["_source"][source_field]
                if hit_context:
                    context += f"{source_field}: {hit_context}\\n"
    prompt = f"""${Prompt(formValues.prompt, {
      context: true,
      citations: formValues.citations,
      type: 'openai',
    })}"""

    return prompt

def generate_openai_completion(user_prompt, question):
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": user_prompt},
            {"role": "user", "content": question},
        ]
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    question = "my question"
    elasticsearch_results = get_elasticsearch_results(question)
    context_prompt = create_openai_prompt(elasticsearch_results)
    openai_completion = generate_openai_completion(context_prompt, question)
    print(openai_completion)

`}
  </EuiCodeBlock>
);
