/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions } from 'kea';

import {
  EuiButtonIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CurationSuggestionLogic } from './curation_suggestion_logic';

export const CurationActionsPopover: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const {
    acceptSuggestion,
    acceptAndAutomateSuggestion,
    rejectSuggestion,
    rejectAndDisableSuggestion,
  } = useActions(CurationSuggestionLogic);

  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonIcon
      iconType="boxesVertical"
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.actionsPopoverAriaLabel',
        { defaultMessage: 'More suggestion actions' }
      )}
      color="text"
      onClick={onButtonClick}
    />
  );
  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiPopoverTitle>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.actionsPopoverTitle',
          {
            defaultMessage: 'Manage suggestion',
          }
        )}
      </EuiPopoverTitle>
      <EuiListGroup flush>
        <EuiListGroupItem
          size="xs"
          iconType="check"
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.actionsAcceptButtonLabel',
            { defaultMessage: 'Accept this suggestion' }
          )}
          onClick={acceptSuggestion}
          data-test-subj="acceptButton"
        />
        <EuiListGroupItem
          size="xs"
          iconType="check"
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.actionsAutomateButtonLabel',
            { defaultMessage: 'Automate - always accept new suggestions for this query' }
          )}
          onClick={acceptAndAutomateSuggestion}
          data-test-subj="automateButton"
        />
        <EuiListGroupItem
          size="xs"
          iconType="cross"
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.actionsRejectButtonLabel',
            { defaultMessage: 'Reject this suggestion' }
          )}
          onClick={rejectSuggestion}
          data-test-subj="rejectButton"
        />
        <EuiListGroupItem
          size="xs"
          iconType="bellSlash"
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.actionsTurnOffButtonLabel',
            { defaultMessage: 'Reject and turn off suggestions for this query' }
          )}
          onClick={rejectAndDisableSuggestion}
          data-test-subj="turnoffButton"
        />
      </EuiListGroup>
    </EuiPopover>
  );
};
