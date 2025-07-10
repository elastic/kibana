/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { buildContextMenuForActions } from '@kbn/ui-actions-plugin/public';

import React, { useCallback, useMemo, useState } from 'react';
import styled from '@emotion/styled';

import useAsync from 'react-use/lib/useAsync';
import { InputsModelId } from '../../store/inputs/constants';
import { ModalInspectQuery } from '../inspect/modal';

import { useInspect } from '../inspect/use_inspect';
import { useLensAttributes } from './use_lens_attributes';

import type { VisualizationActionsProps } from './types';
import { MORE_ACTIONS } from './translations';
import { VISUALIZATION_ACTIONS_BUTTON_CLASS } from './utils';
import { DEFAULT_ACTIONS, useActions, VISUALIZATION_CONTEXT_MENU_TRIGGER } from './use_actions';
import { SourcererScopeName } from '../../../sourcerer/store/model';

const Wrapper = styled.div`
  &.viz-actions {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
  }
  &.histogram-viz-actions {
    padding: ${({ theme }) => theme.euiTheme.size.s};
  }
`;

const VisualizationActionsComponent: React.FC<VisualizationActionsProps> = ({
  applyGlobalQueriesAndFilters = true,
  className,
  extraActions,
  extraOptions,
  getLensAttributes,
  inputId = InputsModelId.global,
  inspectIndex = 0,
  isInspectButtonDisabled,
  isMultipleQuery,
  lensAttributes,
  onCloseInspect,
  queryId,
  timerange,
  title: inspectTitle,
  scopeId = SourcererScopeName.default,
  stackByField,
  withActions = DEFAULT_ACTIONS,
  casesAttachmentMetadata,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = () => {
    setPopover(false);
  };

  const attributes = useLensAttributes({
    applyGlobalQueriesAndFilters,
    extraOptions,
    getLensAttributes,
    lensAttributes,
    scopeId,
    stackByField,
    title: '',
  });

  const dataTestSubj = `stat-${queryId}`;

  const onOpenInspectModal = useCallback(() => {
    closePopover();
    setIsInspectModalOpen(true);
  }, []);

  const onCloseInspectModal = useCallback(() => {
    setIsInspectModalOpen(false);
    if (onCloseInspect) {
      onCloseInspect();
    }
  }, [onCloseInspect]);

  const {
    additionalRequests,
    additionalResponses,
    handleClick: handleInspectButtonClick,
    handleCloseModal: handleCloseInspectModal,
    isButtonDisabled: disableInspectButton,
    request,
    response,
  } = useInspect({
    inputId,
    inspectIndex,
    isDisabled: isInspectButtonDisabled,
    multiple: isMultipleQuery,
    onCloseInspect: onCloseInspectModal,
    onClick: onOpenInspectModal,
    queryId,
  });

  const inspectActionProps = useMemo(
    () => ({
      handleInspectClick: handleInspectButtonClick,
      isInspectButtonDisabled: disableInspectButton,
    }),
    [disableInspectButton, handleInspectButtonClick]
  );

  const contextMenuActions = useActions({
    attributes,
    extraActions,
    inspectActionProps,
    timeRange: timerange,
    withActions,
    lensMetadata: casesAttachmentMetadata,
  });

  const panels = useAsync(
    () =>
      buildContextMenuForActions({
        actions: contextMenuActions.map((action) => ({
          action,
          context: {},
          trigger: VISUALIZATION_CONTEXT_MENU_TRIGGER,
        })),
      }),
    [contextMenuActions]
  );

  const button = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={MORE_ACTIONS}
        className={VISUALIZATION_ACTIONS_BUTTON_CLASS}
        data-test-subj={dataTestSubj}
        iconType="boxesHorizontal"
        onClick={onButtonClick}
      />
    ),
    [dataTestSubj, onButtonClick]
  );

  return (
    <Wrapper className={className}>
      {panels.value && panels.value.length > 0 && (
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          panelClassName="withHoverActions__popover"
          data-test-subj="viz-actions-popover"
        >
          <EuiContextMenu data-test-subj="viz-actions-panel" size="s" panels={panels.value} />
        </EuiPopover>
      )}
      {isInspectModalOpen && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseInspectModal}
          inputId={inputId}
          request={request}
          response={response}
          title={inspectTitle}
        />
      )}
    </Wrapper>
  );
};

VisualizationActionsComponent.displayName = 'VisualizationActionsComponent';
export const VisualizationActions = React.memo(VisualizationActionsComponent);
