/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { EuiButtonEmpty, EuiToolTip, EuiIcon } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';

import { UPDATE_QUERY_IN_FORM_TOOLTIP } from './translations';

export interface UpdateQueryInFormButtonProps {
  query: string;
}

export const UpdateQueryInFormButton: FC<PropsWithChildren<UpdateQueryInFormButtonProps>> = ({
  query,
}) => {
  const { codeBlockRef } = useAssistantContext();

  const handleClick = () => {
    codeBlockRef?.current?.(query);
  };

  return (
    <EuiButtonEmpty
      data-test-subj="update-query-in-form-button"
      aria-label={UPDATE_QUERY_IN_FORM_TOOLTIP}
      onClick={handleClick}
      color="text"
      flush="both"
      size="xs"
    >
      <EuiToolTip position="right" content={UPDATE_QUERY_IN_FORM_TOOLTIP}>
        <EuiIcon type="documentEdit" />
      </EuiToolTip>
    </EuiButtonEmpty>
  );
};

UpdateQueryInFormButton.displayName = 'UpdateQueryInFormButton';
