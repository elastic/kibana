/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '../../../common/search_strategy';
import { useKibana } from '../../common/lib/kibana';
import { listCollaborativeInvestigations } from '../services/list_collaborative_investigations';
import { attachAlertToInvestigation } from '../services/attach_alert_to_investigation';
import {
  ADD_TO_EXISTING_INVESTIGATION_ERROR,
  ADD_TO_EXISTING_INVESTIGATION_MODAL_CANCEL,
  ADD_TO_EXISTING_INVESTIGATION_MODAL_EMPTY,
  ADD_TO_EXISTING_INVESTIGATION_MODAL_NO_SEARCH_RESULTS,
  ADD_TO_EXISTING_INVESTIGATION_MODAL_SEARCH_PLACEHOLDER,
  ADD_TO_EXISTING_INVESTIGATION_MODAL_TITLE,
  ADD_TO_EXISTING_INVESTIGATION_SUCCESS,
} from '../translations';

const MODAL_WIDTH = 480;
const LIST_MAX_HEIGHT = 320;
const LIST_ITEM_TEXT_WIDTH = MODAL_WIDTH - 48;

const createInvestigationListItemStyles = (euiTheme: EuiThemeComputed) =>
  css`
    display: block;
    padding: 6px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    color: ${euiTheme.colors.textParagraph};
    font-size: ${euiTheme.font.scale.m}${euiTheme.font.defaultUnits};
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    text-align: left;

    &:hover:not(:disabled) {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      color: ${euiTheme.colors.textPrimary};
      text-decoration: none;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `;

export interface SelectInvestigationModalProps {
  isOpen: boolean;
  ecsData: Ecs;
  nonEcsData: TimelineNonEcsData[];
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
}

export const SelectInvestigationModal: React.FC<SelectInvestigationModalProps> = ({
  isOpen,
  ecsData,
  nonEcsData,
  onClose,
  onSuccess,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const investigationListItemStyles = useMemo(
    () => createInvestigationListItemStyles(euiTheme),
    [euiTheme]
  );
  const [searchValue, setSearchValue] = useState('');
  const [investigations, setInvestigations] = useState<ConversationWithoutRounds[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const onCloseRef = useRef(onClose);
  const toastsRef = useRef(toasts);

  onCloseRef.current = onClose;
  toastsRef.current = toasts;

  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
      setSelectedConversationId(undefined);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    listCollaborativeInvestigations({ http })
      .then((results) => {
        if (!isCancelled) {
          setInvestigations(results);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          toastsRef.current.addError(error as Error, {
            title: ADD_TO_EXISTING_INVESTIGATION_ERROR,
          });
          onCloseRef.current();
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [http, isOpen]);

  const filteredInvestigations = useMemo(() => {
    if (!searchValue) {
      return investigations;
    }

    const lowerSearch = searchValue.toLowerCase();
    return investigations.filter((investigation) =>
      (investigation.title ?? investigation.id).toLowerCase().includes(lowerSearch)
    );
  }, [investigations, searchValue]);

  const isFilteredEmpty = searchValue.length > 0 && filteredInvestigations.length === 0;

  const handleSelectInvestigation = useCallback(
    async (conversationId: string) => {
      setIsAttaching(true);
      setSelectedConversationId(conversationId);

      try {
        await attachAlertToInvestigation({
          http,
          conversationId,
          ecsData,
          nonEcsData,
        });

        toasts.addSuccess(ADD_TO_EXISTING_INVESTIGATION_SUCCESS);
        onSuccess(conversationId);
        onClose();
      } catch (error) {
        toasts.addError(error as Error, {
          title: ADD_TO_EXISTING_INVESTIGATION_ERROR,
        });
      } finally {
        setIsAttaching(false);
        setSelectedConversationId(undefined);
      }
    },
    [ecsData, http, nonEcsData, onClose, onSuccess, toasts]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="selectInvestigationModal"
      css={css`
        width: ${MODAL_WIDTH}px;
      `}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {ADD_TO_EXISTING_INVESTIGATION_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFieldSearch
          data-test-subj="selectInvestigationModalSearch"
          fullWidth
          isDisabled={isLoading || isAttaching}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={ADD_TO_EXISTING_INVESTIGATION_MODAL_SEARCH_PLACEHOLDER}
          value={searchValue}
        />

        <div
          css={css`
            margin-top: 12px;
            max-height: ${LIST_MAX_HEIGHT}px;
            overflow-y: auto;
          `}
        >
          {isLoading && investigations.length === 0 ? (
            <EuiFlexGroup alignItems="center" justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : filteredInvestigations.length === 0 ? (
            <EuiText color="subdued" size="s">
              {isFilteredEmpty
                ? ADD_TO_EXISTING_INVESTIGATION_MODAL_NO_SEARCH_RESULTS
                : ADD_TO_EXISTING_INVESTIGATION_MODAL_EMPTY}
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="xs">
              {filteredInvestigations.map((investigation) => {
                const isSelected = selectedConversationId === investigation.id;
                const displayTitle = investigation.title || investigation.id;

                return (
                  <EuiFlexItem grow={false} key={investigation.id}>
                    <button
                      aria-label={displayTitle}
                      css={investigationListItemStyles}
                      data-test-subj={`selectInvestigationModalItem-${investigation.id}`}
                      disabled={isAttaching}
                      onClick={() => handleSelectInvestigation(investigation.id)}
                      type="button"
                    >
                      {isSelected && isAttaching ? (
                        <EuiLoadingSpinner size="s" />
                      ) : (
                        <EuiTextTruncate
                          text={displayTitle}
                          truncation="end"
                          width={LIST_ITEM_TEXT_WIDTH}
                        />
                      )}
                    </button>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          )}
        </div>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="selectInvestigationModalCancel"
          disabled={isAttaching}
          onClick={onClose}
        >
          {ADD_TO_EXISTING_INVESTIGATION_MODAL_CANCEL}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
