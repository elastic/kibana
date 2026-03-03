/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { type IHttpFetchError, isHttpFetchError } from '@kbn/core-http-browser';

export interface ObjectContentProps {
  data: object;
}

export const ObjectContent = memo<ObjectContentProps>(({ data }) => {
  return (
    <div>
      {Object.entries(data).map(([key, value]) => {
        return (
          <div key={key} className="eui-textBreakWord">
            <strong>{key}</strong>
            {': '}
            {value}
          </div>
        );
      })}
    </div>
  );
});
ObjectContent.displayName = 'ObjectContent';

export interface FormattedErrorProps {
  error: Error | IHttpFetchError<Record<string, unknown>>;
  'data-test-subj'?: string;
}

/**
 * A general component for formatting errors. Recognizes different types of errors and displays
 * their information.
 */
export const FormattedError = memo<FormattedErrorProps>(
  ({ error, 'data-test-subj': dataTestSubj }) => {
    return useMemo(() => {
      let content: JSX.Element = <>{error.message}</>;

      if (isHttpFetchError(error)) {
        content = (
          // @ts-expect-error upgrade typescript v5.9.3
          <>
            <div>{`${error.response?.status}: ${error.response?.statusText}`}</div>
            {error.body && <ObjectContent data={error.body} />}
          </>
        );
      }

      return (
        <EuiText size="relative" data-test-subj={dataTestSubj}>
          {content}
        </EuiText>
      );
    }, [dataTestSubj, error]);
  }
);
FormattedError.displayName = 'FormattedError';
