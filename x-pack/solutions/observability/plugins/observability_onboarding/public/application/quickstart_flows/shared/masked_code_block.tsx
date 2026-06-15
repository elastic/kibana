/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  type EuiCodeBlockProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyToClipboardButton } from './copy_to_clipboard_button';

const DEFAULT_MASK = '********';

export const maskSecretValues = (value: string, secrets: string[]): string =>
  secrets
    .filter((secret) => secret.length > 0)
    .sort((a, b) => b.length - a.length)
    .reduce((maskedValue, secret) => maskedValue.split(secret).join(DEFAULT_MASK), value);

interface MaskedCodeBlockProps {
  value: string;
  secrets: string[];
  language: EuiCodeBlockProps['language'];
  paddingSize?: EuiCodeBlockProps['paddingSize'];
  overflowHeight?: EuiCodeBlockProps['overflowHeight'];
  dataTestSubj: string;
}

export const MaskedCodeBlock: React.FC<MaskedCodeBlockProps> = ({
  value,
  secrets,
  language,
  paddingSize = 'm',
  overflowHeight,
  dataTestSubj,
}) => {
  const [showSecrets, setShowSecrets] = useState(false);
  const hasSecrets = secrets.some((secret) => secret.length > 0 && value.includes(secret));
  const displayedValue = useMemo(
    () => (showSecrets || !hasSecrets ? value : maskSecretValues(value, secrets)),
    [hasSecrets, secrets, showSecrets, value]
  );

  return (
    <>
      {hasSecrets ? (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate(
                  'xpack.observability_onboarding.maskedCodeBlock.showSecretsSwitchLabel',
                  { defaultMessage: 'Show secrets' }
                )}
                checked={showSecrets}
                onChange={(event) => setShowSecrets(event.target.checked)}
                data-test-subj={`${dataTestSubj}ShowSecretsSwitch`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CopyToClipboardButton
                textToCopy={value}
                size="s"
                data-test-subj={`${dataTestSubj}CopyButton`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiCodeBlock
        paddingSize={paddingSize}
        language={language}
        overflowHeight={overflowHeight}
        isCopyable={!hasSecrets}
        data-test-subj={dataTestSubj}
      >
        {displayedValue}
      </EuiCodeBlock>
    </>
  );
};
