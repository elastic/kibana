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
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UploadedLookups } from '../../lookups_data_input';
import * as i18n from './translations';

const scrollPanelCss = css`
  max-height: 200px;
  overflow-y: auto;
`;

interface MissingLookupsListProps {
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  omitLookup: (lookupsName: string) => void;
  onCopied: () => void;
}
export const MissingLookupsList = React.memo<MissingLookupsListProps>(
  ({ missingLookups, uploadedLookups, omitLookup, onCopied }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.copyExportQuery.description"
              defaultMessage="Log in to your Splunk admin account, go to the {app}, download the following lookups individually and upload them below. You can also omit lookups that are empty or not needed, and they will be ignored in the translation."
              values={{ app: <b>{i18n.LOOKUPS_SPLUNK_APP}</b> }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder className={scrollPanelCss}>
            <EuiFlexGroup direction="column" gutterSize="s">
              {missingLookups.map((lookupName) => {
                const isOmitted = uploadedLookups[lookupName] === '';
                return (
                  <EuiFlexItem key={lookupName}>
                    <EuiFlexGroup
                      direction="row"
                      gutterSize="s"
                      alignItems="center"
                      justifyContent="flexStart"
                    >
                      <EuiFlexItem grow={false}>
                        {uploadedLookups[lookupName] != null ? (
                          <EuiIcon type="checkInCircleFilled" color={euiTheme.colors.success} />
                        ) : (
                          <EuiIcon type="dot" />
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText
                          size="s"
                          style={isOmitted ? { textDecoration: 'line-through' } : {}}
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
                        <OmitLookupButton
                          lookupName={lookupName}
                          omitLookup={omitLookup}
                          isDisabled={isOmitted}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
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
          iconType="copy"
          color="text"
          aria-label={`${i18n.COPY_LOOKUP_NAME_TOOLTIP} ${lookupName}`}
          data-test-subj="lookupNameCopy"
        />
      </EuiToolTip>
    );
  }
);
CopyLookupNameButton.displayName = 'CopyLookupNameButton';

interface OmitLookupButtonProps {
  lookupName: string;
  omitLookup: (lookupName: string) => void;
  isDisabled: boolean;
}
const OmitLookupButton = React.memo<OmitLookupButtonProps>(
  ({ lookupName, omitLookup, isDisabled: isDisabledDefault }) => {
    const [isDisabled, setIsDisabled] = useState(isDisabledDefault);
    const onClick = useCallback(() => {
      setIsDisabled(true);
      omitLookup(lookupName);
    }, [omitLookup, lookupName]);

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
OmitLookupButton.displayName = 'OmitLookupButton';
