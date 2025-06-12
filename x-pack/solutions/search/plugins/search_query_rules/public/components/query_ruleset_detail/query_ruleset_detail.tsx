/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiTitle,
  EuiTourStep,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { useKibana } from '../../hooks/use_kibana';
import { UseRunQueryRuleset } from '../../hooks/use_run_query_ruleset';
import { QueryRulesPageTemplate } from '../../layout/query_rules_page_template';
import { isNotFoundError, isPermissionError } from '../../utils/query_rules_utils';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { DeleteRulesetModal } from '../query_rules_sets/delete_ruleset_modal';
import { QueryRuleDetailPanel } from './query_rule_detail_panel';
import { useQueryRulesetDetailState } from './use_query_ruleset_detail_state';
import { usePutRuleset } from '../../hooks/use_put_query_rules_ruleset';
import { docLinks } from '../../../common/doc_links';

export const QueryRulesetDetail: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application, http, history },
  } = useKibana();
  const { overlays } = useKibana().services;
  const { rulesetId = '' } = useParams<{
    rulesetId?: string;
  }>();

  const { mutate: createRuleset } = usePutRuleset();

  const {
    queryRuleset,
    rules,
    setNewRules,
    addNewRule,
    deleteRule,
    updateRule,
    isInitialLoading,
    isError,
    error,
  } = useQueryRulesetDetailState({
    rulesetId,
  });
  const [isPopoverActionsOpen, setPopoverActions] = useState(false);
  const splitButtonPopoverActionsId = useGeneratedHtmlId({
    prefix: 'splitButtonPopoverActionsId',
  });
  const TOUR_QUERY_RULES_STORAGE_KEY = 'queryRules.tour';

  const tourConfig = {
    currentTourStep: 1,
    isTourActive: true,
    tourPopoverWidth: 360,
  };

  const tourStepsInfo = [
    {
      step: 1,
      title: i18n.translate('xpack.queryRules.queryRulesetDetail.tourStep1Title', {
        defaultMessage: 'Test your ruleset',
      }),
      content: i18n.translate('xpack.queryRules.queryRulesetDetail.tourStep1Content', {
        defaultMessage: 'Now you can try out the query rule results in the console',
      }),
    },
    {
      step: 2,
      title: i18n.translate('xpack.queryRules.queryRulesetDetail.tourStep2Title', {
        defaultMessage: 'Drag the rule to set the priority',
      }),
      content: i18n.translate('xpack.queryRules.queryRulesetDetail.tourStep2Content', {
        defaultMessage:
          'Rules will trigger based on the priority order. The first rule will take precedence over any following rules',
      }),
      tourTargetRef: useRef<HTMLDivElement>(null),
    },
  ];

  const [tourState, setTourState] = useState(() => {
    try {
      const initialState: any = localStorage.getItem(TOUR_QUERY_RULES_STORAGE_KEY);
      if (initialState) {
        try {
          return JSON.parse(initialState) || tourConfig;
        } catch (e) {
          return {
            ...tourConfig,
            isTourActive: false,
          };
        }
      }
      return tourConfig;
    } catch (e) {
      return {
        ...tourConfig,
        isTourActive: false,
      };
    }
  });
  useEffect(() => {
    localStorage.setItem(TOUR_QUERY_RULES_STORAGE_KEY, JSON.stringify(tourState));
  }, [tourState]);
  const incrementStep = () => {
    setTourState({
      ...tourState,
      currentTourStep: tourState.currentTourStep + 1,
    });
  };

  const descrementStep = () => {
    setTourState({
      ...tourState,
      currentTourStep: tourState.currentTourStep - 1,
    });
  };

  const items = [
    <EuiContextMenuItem
      css={css`
        color: ${euiTheme.colors.danger};
      `}
      key="delete"
      icon="trash"
      onClick={() => setRulesetToDelete(rulesetId)}
      data-test-subj="queryRulesetDetailDeleteButton"
    >
      {i18n.translate('xpack.queryRules.queryRulesetDetail.deleteRulesetButton', {
        defaultMessage: 'Delete ruleset',
      })}
    </EuiContextMenuItem>,
  ];

  const [rulesetToDelete, setRulesetToDelete] = useState<string | null>(null);

  const finishTour = () => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  };

  const handleSave = () => {
    setIsFormDirty(false);
    createRuleset({
      rulesetId,
      forceWrite: true,
      rules,
    });
  };

  const [isFormDirty, setIsFormDirty] = useState(false);

  useUnsavedChangesPrompt({
    cancelButtonText: i18n.translate('xpack.queryRules.queryRulesetDetail.unsavedPrompt.cancel', {
      defaultMessage: 'Continue setup',
    }),
    confirmButtonText: i18n.translate('xpack.queryRules.queryRulesetDetail.unsavedPrompt.confirm', {
      defaultMessage: 'Leave the page',
    }),
    hasUnsavedChanges: isFormDirty,
    history,
    http,
    messageText: i18n.translate('xpack.queryRules.queryRulesetDetail.unsavedPrompt.body', {
      defaultMessage: 'Make sure to save your changes before leaving this page.',
    }),
    navigateToUrl: application.navigateToUrl,
    openConfirm: overlays?.openConfirm ?? (() => Promise.resolve(false)),
    titleText: i18n.translate('xpack.queryRules.queryRulesetDetail.unsavedPrompt.title', {
      defaultMessage: 'Your ruleset has some unsaved changes',
    }),
  });

  return (
    <QueryRulesPageTemplate>
      {!isInitialLoading && !isError && !!queryRuleset && (
        <KibanaPageTemplate.Header
          pageTitle={rulesetId}
          breadcrumbs={[
            {
              text: (
                <>
                  <EuiIcon size="s" type="arrowLeft" />{' '}
                  {i18n.translate('xpack.queryRules.queryRulesetDetail.backButton', {
                    defaultMessage: 'Back',
                  })}
                </>
              ),
              color: 'primary',
              'aria-current': false,
              href: '#',
              onClick: () =>
                application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`)),
            },
          ]}
          restrictWidth
          color="primary"
          data-test-subj="queryRulesetDetailHeader"
          rightSideItems={[
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              key="queryRulesetDetailHeaderButtons"
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="queryRulesetDetailApiReferenceButton"
                  iconType="documentation"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.queryRules.queryRulesetDetail.apiReferenceButton',
                    {
                      defaultMessage: 'API reference',
                    }
                  )}
                  href={docLinks.queryRulesApi}
                  target="_blank"
                >
                  {i18n.translate('xpack.queryRules.queryRulesetDetail.apiReferenceButton', {
                    defaultMessage: 'API reference',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTourStep
                  content={<p>{tourStepsInfo[0].content}</p>}
                  isStepOpen={tourState.isTourActive && tourState.currentTourStep === 1}
                  minWidth={tourState.tourPopoverWidth}
                  onFinish={finishTour}
                  step={1}
                  stepsTotal={(queryRuleset?.rules?.length ?? 0) > 1 ? 2 : 1}
                  title={
                    <EuiTitle size="xs">
                      <h6>{tourStepsInfo[0].title}</h6>
                    </EuiTitle>
                  }
                  anchorPosition="rightUp"
                  zIndex={1}
                  footerAction={
                    <EuiFlexGroup direction="row">
                      <EuiFlexItem>
                        {queryRuleset.rules.length > 1 ? (
                          <EuiButtonEmpty
                            data-test-subj="searchQueryRulesQueryRulesetDetailCloseTourButton"
                            size="s"
                            color="text"
                            onClick={finishTour}
                          >
                            {i18n.translate('xpack.queryRules.queryRulesetDetail.closeTourButton', {
                              defaultMessage: 'Close tour',
                            })}
                          </EuiButtonEmpty>
                        ) : (
                          <EuiButton
                            data-test-subj="searchQueryRulesQueryRulesetDetailCloseTourButton"
                            size="s"
                            color="success"
                            onClick={finishTour}
                          >
                            {i18n.translate('xpack.queryRules.queryRulesetDetail.closeTourButton', {
                              defaultMessage: 'Close tour',
                            })}
                          </EuiButton>
                        )}
                      </EuiFlexItem>
                      {queryRuleset.rules.length > 1 && (
                        <EuiFlexItem>
                          <EuiButton
                            data-test-subj="searchQueryRulesQueryRulesetDetailNextButton"
                            color="success"
                            size="s"
                            onClick={incrementStep}
                          >
                            {i18n.translate('xpack.queryRules.queryRulesetDetail.nextTourButton', {
                              defaultMessage: 'Next',
                            })}
                          </EuiButton>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  }
                >
                  <UseRunQueryRuleset
                    rulesetId={rulesetId}
                    type="emptyButton"
                    color="text"
                    content={i18n.translate('xpack.queryRules.queryRulesetDetail.testButton', {
                      defaultMessage: 'Test in Console',
                    })}
                    onClick={finishTour}
                  />
                </EuiTourStep>
              </EuiFlexItem>
              <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="save"
                    fill
                    color="primary"
                    data-test-subj="queryRulesetDetailHeaderSaveButton"
                    onClick={handleSave}
                    disabled={!isFormDirty || isInitialLoading}
                  >
                    <FormattedMessage
                      id="xpack.queryRules.queryRulesetDetail.saveButton"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id={splitButtonPopoverActionsId}
                    button={
                      <EuiButtonIcon
                        data-test-subj="searchQueryRulesQueryRulesetDetailButton"
                        size="m"
                        iconType="boxesVertical"
                        aria-label="More"
                        onClick={() => setPopoverActions(!isPopoverActionsOpen)}
                      />
                    }
                    isOpen={isPopoverActionsOpen}
                    closePopover={() => setPopoverActions(false)}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenuPanel size="s" items={items} />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>,
          ]}
        />
      )}
      {!isError && (
        <>
          <QueryRuleDetailPanel
            rulesetId={rulesetId}
            setNewRules={setNewRules}
            addNewRule={addNewRule}
            deleteRule={deleteRule}
            updateRule={updateRule}
            rules={rules}
            tourInfo={tourStepsInfo[1]}
            setIsFormDirty={setIsFormDirty}
          />

          {tourStepsInfo[1]?.tourTargetRef?.current !== null && (
            <EuiTourStep
              anchor={() => tourStepsInfo[1]?.tourTargetRef?.current || document.body}
              content={<p>{tourStepsInfo[1].content}</p>}
              isStepOpen={tourState.isTourActive && tourState.currentTourStep === 2}
              maxWidth={tourState.tourPopoverWidth}
              onFinish={finishTour}
              step={1}
              stepsTotal={(queryRuleset?.rules?.length ?? 0) > 1 ? 2 : 1}
              title={
                <EuiTitle size="xs">
                  <h6>{tourStepsInfo[1].title}</h6>
                </EuiTitle>
              }
              anchorPosition="downLeft"
              zIndex={1}
              footerAction={
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiButtonEmpty
                      data-test-subj="searchQueryRulesQueryRulesetDetailNextButton"
                      size="s"
                      color="text"
                      onClick={descrementStep}
                    >
                      {i18n.translate('xpack.queryRules.queryRulesetDetail.backTourButton', {
                        defaultMessage: 'Back',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="searchQueryRulesQueryRulesetDetailCloseTourButton"
                      size="s"
                      color="success"
                      onClick={finishTour}
                    >
                      {i18n.translate('xpack.queryRules.queryRulesetDetail.closeTourButton', {
                        defaultMessage: 'Close tour',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          )}
        </>
      )}
      {rulesetToDelete && (
        <DeleteRulesetModal
          rulesetId={rulesetToDelete}
          closeDeleteModal={() => {
            setRulesetToDelete(null);
          }}
          onSuccessAction={() => {
            application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`));
          }}
        />
      )}
      {isError && error && (
        <ErrorPrompt
          errorType={
            isPermissionError(error)
              ? 'missingPermissions'
              : isNotFoundError(error)
              ? 'notFound'
              : 'generic'
          }
          data-test-subj="queryRulesetDetailErrorPrompt"
        />
      )}
    </QueryRulesPageTemplate>
  );
};
