/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlyoutFooter } from '@elastic/eui';
import React, { memo } from 'react';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';
import { EndpointScriptDetailsActions } from './script_details_actions';
import type { UseScriptActionItemsProps } from '../../hooks/use_script_action_items';

interface EndpointScriptDetailsFlyoutFooterProps {
  scriptItem: EndpointScript;
  onClickAction: UseScriptActionItemsProps['onClickAction'];
  'data-test-subj'?: string;
}
export const EndpointScriptDetailsFlyoutFooter = memo<EndpointScriptDetailsFlyoutFooterProps>(
  ({ onClickAction, scriptItem, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiFlyoutFooter className="eui-textRight" data-test-subj={dataTestSubj}>
        <EndpointScriptDetailsActions
          data-test-subj={dataTestSubj}
          scriptItem={scriptItem}
          onClickAction={onClickAction}
        />
      </EuiFlyoutFooter>
    );
  }
);

EndpointScriptDetailsFlyoutFooter.displayName = 'EndpointScriptDetailsFlyoutFooter';
