/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuPanel, EuiPopover, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityToAttach } from '..';
import { AddToNewCase } from './add_to_new_case';
import { AddToExistingCase } from './add_to_existing_case';
import {
  ADD_TO_CASE_BUTTON_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID,
  ADD_TO_EXISTING_CASE_TEST_ID,
} from './test_ids';
import { useKibana } from '../../../../common/lib/kibana';

export interface EntityAddToCaseProps {
  /**
   * Entity used to generate the attachment posted to a case.
   */
  entity: EntityToAttach;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

/**
 * Renders an "Add to case" button that opens a popover with two actions:
 * add the entity to a new case, or to an existing case. Designed to be dropped
 * into any entity surface (flyout header, table row actions, etc.).
 */
export const EntityAddToCase: FC<EntityAddToCaseProps> = ({
  entity,
  'data-test-subj': dataTestSubj = ADD_TO_CASE_BUTTON_TEST_ID,
}) => {
  const { cases } = useKibana().services;
  const attachmentsEnabled = cases.config.attachmentsEnabled;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  const popoverId = useGeneratedHtmlId({ prefix: 'entityAddToCasePopover' });

  if (!attachmentsEnabled) {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      size="s"
      iconType="casesApp"
      onClick={togglePopover}
      data-test-subj={dataTestSubj}
    >
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.cases.addToCase"
        defaultMessage="Add to case"
      />
    </EuiButtonEmpty>
  );

  const items = [
    <AddToNewCase
      key="addToNewCase"
      entity={entity}
      onClick={closePopover}
      data-test-subj={ADD_TO_NEW_CASE_TEST_ID}
    />,
    <AddToExistingCase
      key="addToExistingCase"
      entity={entity}
      onClick={closePopover}
      data-test-subj={ADD_TO_EXISTING_CASE_TEST_ID}
    />,
  ];

  return (
    <EuiPopover
      id={popoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
