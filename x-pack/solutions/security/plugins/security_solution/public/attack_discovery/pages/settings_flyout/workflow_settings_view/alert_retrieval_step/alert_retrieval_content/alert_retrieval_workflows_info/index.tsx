/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useKibana } from '../../../../../../../common/lib/kibana';
import type { UseFetchDefaultEsqlQueryResult } from '../../../../workflow_configuration/hooks/use_fetch_default_esql_query';
import {
  ALERT_RETRIEVAL_WORKFLOWS_CLOSE_BUTTON,
  ALERT_RETRIEVAL_WORKFLOWS_COPY_BUTTON,
  ALERT_RETRIEVAL_WORKFLOWS_EXAMPLE_LABEL,
  ALERT_RETRIEVAL_WORKFLOWS_INFO_ARIA_LABEL,
  ALERT_RETRIEVAL_WORKFLOWS_POPOVER_DETAIL,
  ALERT_RETRIEVAL_WORKFLOWS_POPOVER_HEADLINE,
  CREATE_NEW_WORKFLOW,
} from '../../../../workflow_configuration/translations';
import { buildAlertRetrievalWorkflowExampleYaml } from './helpers/build_alert_retrieval_workflow_example_yaml';
import { buildFallbackEsqlQuery } from './helpers/build_fallback_esql_query';

const MAX_POPOVER_WIDTH = 520;

export interface AlertRetrievalWorkflowsInfoProps {
  fetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult;
}

const AlertRetrievalWorkflowsInfoComponent: React.FC<AlertRetrievalWorkflowsInfoProps> = ({
  fetchDefaultEsqlQueryResult,
}) => {
  const { application, spaces } = useKibana().services;
  const { defaultEsqlQuery, fetchDefaultEsqlQuery } = fetchDefaultEsqlQueryResult;

  const [isOpen, setIsOpen] = useState(false);
  const [spaceId, setSpaceId] = useState<string | undefined>(undefined);

  const createWorkflowUrl = useMemo(() => {
    try {
      const workflowsUrl = application?.getUrlForApp('workflows') ?? '';

      return workflowsUrl !== '' ? `${workflowsUrl}/create` : '';
    } catch {
      return '';
    }
  }, [application]);

  const onButtonClick = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  // When the popover is opened, ensure the (always default) ES|QL query is
  // fetched and resolve the active space id used by the fallback query.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetchDefaultEsqlQuery();

    let cancelled = false;

    const resolveSpaceId = async () => {
      const activeSpace = await spaces?.getActiveSpace();

      if (!cancelled && activeSpace != null) {
        setSpaceId(activeSpace.id);
      }
    };

    void resolveSpaceId();

    return () => {
      cancelled = true;
    };
  }, [fetchDefaultEsqlQuery, isOpen, spaces]);

  const esqlQuery = defaultEsqlQuery ?? buildFallbackEsqlQuery({ spaceId });

  const exampleYaml = useMemo(
    () => buildAlertRetrievalWorkflowExampleYaml({ esqlQuery }),
    [esqlQuery]
  );

  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={ALERT_RETRIEVAL_WORKFLOWS_INFO_ARIA_LABEL}
        data-test-subj="alertRetrievalWorkflowsInfoButton"
        iconType="info"
        onClick={onButtonClick}
      />
    ),
    [onButtonClick]
  );

  return (
    <EuiPopover
      anchorPosition="rightUp"
      button={button}
      closePopover={closePopover}
      data-test-subj="alertRetrievalWorkflowsInfoPopover"
      isOpen={isOpen}
    >
      <EuiPopoverTitle>{ALERT_RETRIEVAL_WORKFLOWS_POPOVER_HEADLINE}</EuiPopoverTitle>

      <div
        css={css`
          max-width: ${MAX_POPOVER_WIDTH}px;
        `}
      >
        <EuiCallOut
          color="primary"
          data-test-subj="alertRetrievalWorkflowsDetailCallout"
          iconType="info"
          size="s"
          title={ALERT_RETRIEVAL_WORKFLOWS_POPOVER_DETAIL}
        />

        <EuiSpacer size="m" />

        <EuiText color="subdued" size="xs">
          <strong>{ALERT_RETRIEVAL_WORKFLOWS_EXAMPLE_LABEL}</strong>
        </EuiText>

        <EuiSpacer size="xs" />

        <EuiCodeBlock
          data-test-subj="alertRetrievalWorkflowsExampleYaml"
          fontSize="s"
          isCopyable
          language="yaml"
          overflowHeight={320}
          paddingSize="s"
        >
          {exampleYaml}
        </EuiCodeBlock>

        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={exampleYaml}>
              {(copy) => (
                <EuiButtonEmpty
                  data-test-subj="alertRetrievalWorkflowsCopyButton"
                  iconType="copyClipboard"
                  onClick={copy}
                  size="s"
                >
                  {ALERT_RETRIEVAL_WORKFLOWS_COPY_BUTTON}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="alertRetrievalWorkflowsCloseButton"
              onClick={closePopover}
              size="s"
            >
              {ALERT_RETRIEVAL_WORKFLOWS_CLOSE_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="alertRetrievalWorkflowsCreateButton"
              fill
              href={createWorkflowUrl}
              iconSide="right"
              iconType="popout"
              isDisabled={createWorkflowUrl === ''}
              onClick={closePopover}
              size="s"
              target="_blank"
            >
              {CREATE_NEW_WORKFLOW}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

AlertRetrievalWorkflowsInfoComponent.displayName = 'AlertRetrievalWorkflowsInfo';

export const AlertRetrievalWorkflowsInfo = React.memo(AlertRetrievalWorkflowsInfoComponent);
