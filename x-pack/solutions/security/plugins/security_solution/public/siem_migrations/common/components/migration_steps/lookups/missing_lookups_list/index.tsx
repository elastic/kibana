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
import type { UploadedLookups } from '../../types';
import { MigrationSource } from '../../../../types';
import { useRuleMigrationVendorCopy } from '../../../../../rules/hooks/use_rule_migration_vendor_copy';

const scrollPanelCss = css`
  max-height: 200px;
  overflow-y: auto;
`;

interface MissingLookupsListProps {
  migrationSource?: MigrationSource;
  missingLookups: string[];
  uploadedLookups: UploadedLookups;
  omitLookup: (lookupsName: string) => void;
  onCopied: () => void;
}
export const MissingLookupsList = React.memo<MissingLookupsListProps>(
  ({
    migrationSource = MigrationSource.SPLUNK,
    missingLookups,
    uploadedLookups,
    omitLookup,
    onCopied,
  }) => {
    const { euiTheme } = useEuiTheme();
    const { missingLookupsList } = useRuleMigrationVendorCopy(migrationSource);
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{missingLookupsList.description}</EuiText>
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
                          <EuiIcon
                            type="checkCircleFill"
                            color={euiTheme.colors.success}
                            aria-hidden={true}
                          />
                        ) : (
                          <EuiIcon type="dot" aria-hidden={true} />
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
                              migrationSource={migrationSource}
                            />
                          )}
                        </EuiCopy>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <OmitLookupButton
                          lookupName={lookupName}
                          omitLookup={omitLookup}
                          isDisabled={isOmitted}
                          migrationSource={migrationSource}
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
  migrationSource: MigrationSource;
}

const CopyLookupNameButton = React.memo<CopyLookupNameButtonProps>(
  ({ lookupName, onCopied, copy, migrationSource }) => {
    const { missingLookupsList } = useRuleMigrationVendorCopy(migrationSource);
    const onClick = useCallback(() => {
      copy();
      onCopied();
    }, [copy, onCopied]);

    return (
      <EuiToolTip content={missingLookupsList.copyNameTooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          onClick={onClick}
          iconType="copy"
          color="text"
          aria-label={`${missingLookupsList.copyNameTooltip} ${lookupName}`}
          data-test-subj={missingLookupsList.copyNameTestId}
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
  migrationSource: MigrationSource;
}
const OmitLookupButton = React.memo<OmitLookupButtonProps>(
  ({ lookupName, omitLookup, isDisabled: isDisabledDefault, migrationSource }) => {
    const [isDisabled, setIsDisabled] = useState(isDisabledDefault);
    const { missingLookupsList } = useRuleMigrationVendorCopy(migrationSource);
    const onClick = useCallback(() => {
      setIsDisabled(true);
      omitLookup(lookupName);
    }, [omitLookup, lookupName]);

    const button = useMemo(
      () => (
        <EuiToolTip content={missingLookupsList.clearEmptyTooltip} disableScreenReaderOutput>
          <EuiButtonIcon
            onClick={onClick}
            iconType="cross"
            color="text"
            aria-label={missingLookupsList.clearEmptyTooltip}
            data-test-subj={missingLookupsList.clearEmptyTestId}
            isDisabled={isDisabled}
          />
        </EuiToolTip>
      ),
      [onClick, missingLookupsList, isDisabled]
    );
    if (isDisabled) {
      return button;
    }
    return <EuiToolTip content={missingLookupsList.clearEmptyTooltip}>{button}</EuiToolTip>;
  }
);
OmitLookupButton.displayName = 'OmitLookupButton';
