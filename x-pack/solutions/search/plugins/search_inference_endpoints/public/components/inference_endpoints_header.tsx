/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageTemplate,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import * as i18n from '../../common/translations';
import { PLUGIN_TITLE } from '../../common/constants';
import { docLinks } from '../../common/doc_links';

interface InferenceEndpointsHeaderProps {
  onFlyoutOpen: () => void;
}
export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  onFlyoutOpen,
}) => {
  return (
    <EuiPageTemplate.Header
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={PLUGIN_TITLE}
      description={
        <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
          <EuiFlexItem grow={false}>{i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              href={docLinks.elasticInferenceService}
              target="_blank"
              data-test-subj="get-started-link"
              color="text"
              size="s"
            >
              {i18n.GET_STARTED_LINK}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      bottomBorder={true}
      rightSideItems={[
        <EuiButton
          iconType="plusInCircle"
          fill
          iconSize="m"
          data-test-subj="add-inference-endpoint-header-button"
          onClick={onFlyoutOpen}
        >
          {i18n.ADD_ENDPOINT_LABEL}
        </EuiButton>,
        <EuiButtonEmpty
          aria-label={i18n.API_DOCUMENTATION_LINK}
          iconType="popout"
          iconSide="right"
          iconSize="s"
          flush="both"
          target="_blank"
          data-test-subj="api-documentation"
          href={docLinks.createInferenceEndpoint}
        >
          {i18n.API_DOCUMENTATION_LINK}
        </EuiButtonEmpty>,
      ]}
    />
  );
};
