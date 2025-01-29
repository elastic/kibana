/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { map, reduce } from 'lodash';
import ReactMarkdown from 'react-markdown';
import { ResponseActionsWrapper } from './response_actions_wrapper';
import { FORM_ERRORS_TITLE } from '../rule_creation/components/rule_actions_field/translations';
import { ResponseActionsHeader } from './response_actions_header';
import type { ArrayItem, FormHook } from '../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';
import { getActionDetails } from './constants';

interface ResponseActionsFormProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  form: FormHook;
}

export const ResponseActionsForm = ({
  items,
  addItem,
  removeItem,
  form,
}: ResponseActionsFormProps) => {
  const supportedResponseActionTypes = useSupportedResponseActionTypes();
  const [uiFieldErrors, setUIFieldErrors] = useState<string | null>(null);
  const fields = form.getFields();
  const errors = form.getErrors();

  const formContent = useMemo(() => {
    if (!supportedResponseActionTypes?.length) {
      return null;
    }

    return (
      <ResponseActionsWrapper
        items={items}
        removeItem={removeItem}
        supportedResponseActionTypes={supportedResponseActionTypes}
        addItem={addItem}
      />
    );
  }, [addItem, items, removeItem, supportedResponseActionTypes]);

  useEffect(() => {
    setUIFieldErrors(() => {
      const fieldErrors = reduce<string[], Array<{ type: string; errors: string[] }>>(
        map(items, 'path'),
        (acc, path) => {
          map(fields, (_, name) => {
            const paramsPath = `${path}.params`;

            if (name.includes(paramsPath)) {
              if (fields[name]?.errors?.length) {
                const responseActionType = getActionDetails(
                  fields[`${path}.actionTypeId`].value as string
                ).name;
                acc.push({
                  type: responseActionType,
                  errors: map(fields[name].errors, 'message'),
                });
              }
              return acc;
            }

            return acc;
          });
          return acc;
        },
        []
      );

      return reduce(
        fieldErrors,
        (acc, error) => {
          acc.push(`**${error.type}:**\n`);
          error.errors.forEach((err) => {
            acc.push(`- ${err}\n`);
          });

          return acc;
        },
        [] as string[]
      ).join('\n');
    });
  }, [fields, errors, items]);

  return (
    <>
      <EuiSpacer size="xxl" data-test-subj={'response-actions-form'} />
      <ResponseActionsHeader />
      {uiFieldErrors?.length ? (
        <>
          <p>
            <EuiCallOut
              data-test-subj="response-actions-error"
              title={FORM_ERRORS_TITLE}
              color="danger"
              iconType="warning"
            >
              <ReactMarkdown>{uiFieldErrors}</ReactMarkdown>
            </EuiCallOut>
          </p>
          <EuiSpacer />
        </>
      ) : null}
      {formContent}
    </>
  );
};
