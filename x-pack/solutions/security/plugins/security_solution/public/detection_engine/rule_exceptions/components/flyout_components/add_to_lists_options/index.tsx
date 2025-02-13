/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiText,
  EuiRadio,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiButtonEmpty,
  EuiPopoverFooter,
} from '@elastic/eui';

import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import { ExceptionsAddToListsTable } from '../add_to_lists_table';
import { useKibana } from '../../../../../common/lib/kibana';

interface ExceptionsAddToListsOptionsComponentProps {
  rulesCount: number;
  selectedRadioOption: string;
  sharedLists: ListArray;
  onListsSelectionChange: (listsSelectedToAdd: ExceptionListSchema[]) => void;
  onRadioChange: (option: string) => void;
}

const ExceptionsAddToListsOptionsComponent: React.FC<ExceptionsAddToListsOptionsComponentProps> = ({
  rulesCount,
  selectedRadioOption,
  sharedLists,
  onListsSelectionChange,
  onRadioChange,
}): JSX.Element => {
  const { navigateToApp } = useKibana().services.application;
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const closePopover = () => setIsPopoverOpen(false);
  const onPopOverButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  return (
    <>
      <EuiRadio
        id="add_to_lists"
        label={
          <EuiFlexGroup
            alignItems="flexStart"
            gutterSize="none"
            responsive={false}
            data-test-subj="addToListsRadioOptionLabel"
          >
            <EuiFlexItem grow={false}>
              <EuiText>{i18n.ADD_TO_LISTS_OPTION}</EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj="addToListsOption">
              <EuiPopover
                button={
                  <EuiButtonIcon
                    iconType="iInCircle"
                    onClick={onPopOverButtonClick}
                    aria-label={i18n.ADD_TO_LISTS_OPTION_TOOLTIP_ARIA_LABEL}
                  />
                }
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                anchorPosition="upCenter"
              >
                <div style={{ width: '300px' }}>
                  <EuiText size="s">
                    {sharedLists.length === 0
                      ? i18n.ADD_TO_LISTS_OPTION_DISABLED_TOOLTIP(rulesCount)
                      : i18n.ADD_TO_LISTS_OPTION_TOOLTIP}
                  </EuiText>
                </div>
                <EuiPopoverFooter>
                  <EuiButtonEmpty
                    size="s"
                    iconType="popout"
                    iconSide="right"
                    onClick={() =>
                      navigateToApp('security', { openInNewTab: true, path: '/exceptions' })
                    }
                  >
                    {i18n.GO_TO_EXCEPTIONS}
                  </EuiButtonEmpty>
                </EuiPopoverFooter>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checked={selectedRadioOption === 'add_to_lists'}
        disabled={sharedLists.length === 0 && rulesCount > 0}
        onChange={() => onRadioChange('add_to_lists')}
        data-test-subj="addToListsRadioOption"
      />

      {selectedRadioOption === 'add_to_lists' && (sharedLists.length > 0 || rulesCount === 0) && (
        <ExceptionsAddToListsTable
          showAllSharedLists={rulesCount === 0}
          sharedExceptionLists={sharedLists}
          onListSelectionChange={onListsSelectionChange}
          data-test-subj="exceptionsAddToListTable"
        />
      )}
    </>
  );
};

export const ExceptionsAddToListsOptions = React.memo(ExceptionsAddToListsOptionsComponent);

ExceptionsAddToListsOptions.displayName = 'ExceptionsAddToListsOptions';
