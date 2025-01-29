/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { ENTERPRISE_SEARCH_CONTENT_APP_ID } from '@kbn/deeplinks-search';

import { SEARCH_INDICES } from '@kbn/deeplinks-search/constants';
import { InferenceUsageInfo } from '../../../../types';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { RenderMessageWithIcon } from './render_message_with_icon';
import * as i18n from '../delete/confirm_delete_endpoint/translations';
import { ListUsageResults } from './list_usage_results';

interface ScanUsageResultsProps {
  list: InferenceUsageInfo[];
  ignoreWarningCheckbox: boolean;
  onIgnoreWarningCheckboxChange: (state: boolean) => void;
}

export const ScanUsageResults: React.FC<ScanUsageResultsProps> = ({
  list,
  ignoreWarningCheckbox,
  onIgnoreWarningCheckboxChange,
}) => {
  const {
    services: { application, serverless },
  } = useKibana();
  const handleNavigateToIndexManagement = () => {
    if (serverless) {
      application?.navigateToApp(SEARCH_INDICES, {
        openInNewTab: true,
      });
    } else {
      application?.navigateToApp(ENTERPRISE_SEARCH_CONTENT_APP_ID, {
        path: `search_indices`,
        openInNewTab: true,
      });
    }
  };

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem>
        <RenderMessageWithIcon
          icon="warning"
          color="danger"
          label={i18n.POTENTIAL_FAILURE_LABEL}
          labelColor="danger"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    css={css`
                      font-weight: ${euiThemeVars.euiCodeFontWeightBold};
                    `}
                  >
                    <p>{i18n.COUNT_USAGE_LABEL(list.length)}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleNavigateToIndexManagement}
                    iconType="popout"
                    iconSide="right"
                    iconSize="s"
                    flush="both"
                    color="text"
                    aria-label={i18n.OPEN_INDEX_MANAGEMENT}
                    data-test-subj="inferenceManagementOpenIndexManagement"
                  >
                    <EuiText size="xs">{i18n.OPEN_INDEX_MANAGEMENT}</EuiText>
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <ListUsageResults list={list} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiCheckbox
            data-test-subj="warningCheckbox"
            id={'ignoreWarningCheckbox'}
            label={i18n.IGNORE_POTENTIAL_ERRORS_LABEL}
            checked={ignoreWarningCheckbox}
            onChange={(e) => onIgnoreWarningCheckboxChange(e.target.checked)}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
