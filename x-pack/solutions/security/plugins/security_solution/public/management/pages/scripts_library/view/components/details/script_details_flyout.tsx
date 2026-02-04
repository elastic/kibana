/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ListScriptsRequestQuery } from '../../../../../../../common/api/endpoint';
import type { EndpointScript } from '../../../../../../../common/endpoint/types';

import type { UseScriptActionItemsProps } from '../../hooks/use_script_action_items';
import { EndpointScriptDetailsFlyoutHeader } from './script_details_flyout_header';
import { EndpointScriptDetailsFlyoutBody } from './script_details_flyout_body';
import { EndpointScriptDetailsFlyoutFooter } from './script_details_flyout_footer';

export interface EndpointScriptDetailsFlyoutProps {
  queryParams: ListScriptsRequestQuery;
  scriptItem: EndpointScript;
  onClickAction: UseScriptActionItemsProps['onClickAction'];
  'data-test-subj'?: string;
}
export const EndpointScriptDetailsFlyout = memo<EndpointScriptDetailsFlyoutProps>(
  ({ queryParams, scriptItem, onClickAction, 'data-test-subj': dataTestSubj }) => {
    return (
      <>
        <EndpointScriptDetailsFlyoutHeader
          scriptName={scriptItem.name}
          platforms={scriptItem.platform}
          lastUpdated={scriptItem.updatedAt}
          data-test-subj={`${dataTestSubj}-header`}
        />
        <EndpointScriptDetailsFlyoutBody
          scriptItem={scriptItem}
          data-test-subj={`${dataTestSubj}-body`}
        />
        <EndpointScriptDetailsFlyoutFooter
          queryParams={queryParams}
          scriptItem={scriptItem}
          onClickAction={onClickAction}
          data-test-subj={`${dataTestSubj}-footer`}
        />
      </>
    );
  }
);

EndpointScriptDetailsFlyout.displayName = 'EndpointScriptDetailsFlyout';
