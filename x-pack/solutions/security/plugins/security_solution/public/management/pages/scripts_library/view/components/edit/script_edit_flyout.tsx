/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import type { usePatchEndpointScript } from '../../../../../hooks/script_library';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';

import { EndpointScriptEditFlyoutHeader } from './script_edit_flyout_header';
import { EndpointScriptEditForm, type EndpointScriptEditFormProps } from './script_edit_form';
import { EndpointScriptEditFlyoutFooter } from './script_edit_flyout_footer';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';

export interface EndpointScriptEditFlyoutProps {
  error: ReturnType<typeof usePatchEndpointScript>['error'];
  isDisabled: boolean;
  isSubmittingData: boolean;
  scriptItem?: EndpointScript & { file?: File };
  show: Extract<Required<ScriptsLibraryUrlParams>['show'], 'edit' | 'create'>;
  onChange: EndpointScriptEditFormProps['onChange'];
  onClose: () => void;
  onSubmit: ({
    type,
  }: {
    type: Extract<ScriptsLibraryUrlParams['show'], 'create' | 'edit'>;
  }) => void;
  'data-test-subj'?: string;
}
export const EndpointScriptEditFlyout = memo<EndpointScriptEditFlyoutProps>(
  ({
    error,
    isDisabled,
    isSubmittingData,
    scriptItem,
    show,
    onChange,
    onClose,
    onSubmit,
    'data-test-subj': dataTestSubj,
  }) => {
    return (
      <>
        <EndpointScriptEditFlyoutHeader show={show} data-test-subj={`${dataTestSubj}-header`} />
        <EuiFlyoutBody data-test-subj={`${dataTestSubj}-body`}>
          <EndpointScriptEditForm
            scriptItem={scriptItem}
            show={show}
            onChange={onChange}
            data-test-subj={`${dataTestSubj}`}
            error={error ?? undefined}
          />
        </EuiFlyoutBody>
        <EndpointScriptEditFlyoutFooter
          onClose={onClose}
          onSubmit={onSubmit}
          show={show}
          isDisabled={isDisabled}
          isLoading={isSubmittingData}
          data-test-subj={`${dataTestSubj}-footer`}
        />
      </>
    );
  }
);

EndpointScriptEditFlyout.displayName = 'EndpointScriptEditFlyout';
