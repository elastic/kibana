/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { usePatchEndpointScript } from '../../../../../hooks/script_library';

import { EndpointScriptEditFlyoutHeader } from './script_edit_flyout_header';
import { EndpointScriptEditForm, type EndpointScriptEditFormProps } from './script_edit_form';
import { EndpointScriptEditFlyoutFooter } from './script_edit_flyout_footer';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';
import type { ScriptFlyoutScriptItem } from './types';

export interface EndpointScriptEditFlyoutProps {
  error: ReturnType<typeof usePatchEndpointScript>['error'];
  isDisabled: boolean;
  isSubmittingData: boolean;
  scriptItem?: ScriptFlyoutScriptItem;
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
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <>
        <EndpointScriptEditFlyoutHeader show={show} data-test-subj={getTestId('header')} />
        <EuiFlyoutBody data-test-subj={getTestId('body')}>
          <EndpointScriptEditForm
            scriptItem={scriptItem}
            onChange={onChange}
            data-test-subj={getTestId('form')}
            error={error ?? undefined}
          />
        </EuiFlyoutBody>
        <EndpointScriptEditFlyoutFooter
          onClose={onClose}
          onSubmit={onSubmit}
          show={show}
          isDisabled={isDisabled}
          isLoading={isSubmittingData}
          data-test-subj={getTestId('footer')}
        />
      </>
    );
  }
);

EndpointScriptEditFlyout.displayName = 'EndpointScriptEditFlyout';
