/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';

import type { UseScriptActionItemsProps } from '../../hooks/use_script_action_items';
import { EndpointScriptDetailsFlyoutHeader } from './script_details_flyout_header';
import { EndpointScriptDetailsFlyoutBody } from './script_details_flyout_body';
import { EndpointScriptDetailsFlyoutFooter } from './script_details_flyout_footer';

export interface EndpointScriptDetailsFlyoutProps {
  scriptItem: EndpointScript;
  onClickAction: UseScriptActionItemsProps['onClickAction'];
  'data-test-subj'?: string;
}
export const EndpointScriptDetailsFlyout = memo<EndpointScriptDetailsFlyoutProps>(
  ({ scriptItem, onClickAction, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <>
        <EndpointScriptDetailsFlyoutHeader
          scriptName={scriptItem.name}
          platforms={scriptItem.platform}
          lastUpdated={scriptItem.updatedAt}
          data-test-subj={getTestId('header')}
        />
        <EndpointScriptDetailsFlyoutBody
          scriptItem={scriptItem}
          data-test-subj={getTestId('body')}
        />
        <EndpointScriptDetailsFlyoutFooter
          scriptItem={scriptItem}
          onClickAction={onClickAction}
          data-test-subj={getTestId('footer')}
        />
      </>
    );
  }
);

EndpointScriptDetailsFlyout.displayName = 'EndpointScriptDetailsFlyout';
