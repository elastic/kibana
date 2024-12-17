/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { EMPTY_RESOURCE_PLACEHOLDER } from '../../../../../../../../../common/siem_migrations/constants';
import type { UploadedLookups } from '../../lookups_data_input';
import * as i18n from './translations';

const scrollPanelCss = css`
  max-height: 200px;
  overflow-y: auto;
`;

interface MissingLookupsListProps {
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  clearLookup: (lookupsName: string) => void;
  onCopied: () => void;
}
export const MissingLookupsList = React.memo<MissingLookupsListProps>(
  ({ missingLookups, uploadedLookups, clearLookup, onCopied }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <>
        <EuiPanel hasShadow={false} hasBorder className={scrollPanelCss}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {missingLookups.map((lookupName) => {
              const isMarkedAsEmpty = uploadedLookups[lookupName] === EMPTY_RESOURCE_PLACEHOLDER;
              return (
                <EuiFlexItem key={lookupName}>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    alignItems="center"
                    justifyContent="flexStart"
                  >
                    <EuiFlexItem grow={false}>
                      {uploadedLookups[lookupName] ? (
                        <EuiIcon type="checkInCircleFilled" color={euiTheme.colors.success} />
                      ) : (
                        <EuiIcon type="dot" />
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="s"
                        style={isMarkedAsEmpty ? { textDecoration: 'line-through' } : {}}
                      >
                        {lookupName}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy textToCopy={lookupName}>
                        {(copy) => (
                          <CopyLookupNameButton
                            lookupName={lookupName}
                            onCopied={onCopied}
                            copy={copy}
                          />
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <ClearLookupButton
                        lookupName={lookupName}
                        clearLookup={clearLookup}
                        isDisabled={isMarkedAsEmpty}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.MISSING_LOOKUPS_DESCRIPTION}
        </EuiText>
      </>
    );
  }
);
MissingLookupsList.displayName = 'MissingLookupsList';

interface CopyLookupNameButtonProps {
  lookupName: string;
  onCopied: () => void;
  copy: () => void;
}
const CopyLookupNameButton = React.memo<CopyLookupNameButtonProps>(
  ({ lookupName, onCopied, copy }) => {
    const onClick = useCallback(() => {
      copy();
      onCopied();
    }, [copy, onCopied]);
    return (
      <EuiToolTip content={i18n.COPY_LOOKUP_NAME_TOOLTIP}>
        <EuiButtonIcon
          onClick={onClick}
          iconType="copyClipboard"
          color="text"
          aria-label={`${i18n.COPY_LOOKUP_NAME_TOOLTIP} ${lookupName}`}
          data-test-subj="lookupNameCopy"
        />
      </EuiToolTip>
    );
  }
);
CopyLookupNameButton.displayName = 'CopyLookupNameButton';

interface ClearLookupButtonProps {
  lookupName: string;
  clearLookup: (lookupName: string) => void;
  isDisabled: boolean;
}
const ClearLookupButton = React.memo<ClearLookupButtonProps>(
  ({ lookupName, clearLookup, isDisabled: isDisabledDefault }) => {
    const [isDisabled, setIsDisabled] = useState(isDisabledDefault);
    const onClick = useCallback(() => {
      setIsDisabled(true);
      clearLookup(lookupName);
    }, [clearLookup, lookupName]);

    const button = useMemo(
      () => (
        <EuiButtonIcon
          onClick={onClick}
          iconType="cross"
          color="text"
          aria-label={i18n.CLEAR_EMPTY_LOOKUP_TOOLTIP}
          data-test-subj="lookupNameClear"
          isDisabled={isDisabled}
        />
      ),
      [onClick, isDisabled]
    );
    if (isDisabled) {
      return button;
    }
    return <EuiToolTip content={i18n.CLEAR_EMPTY_LOOKUP_TOOLTIP}>{button}</EuiToolTip>;
  }
);
ClearLookupButton.displayName = 'ClearLookupButton';
