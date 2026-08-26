/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTourStep,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useParams } from 'react-router-dom';
import { PLUGIN_TITLE } from '../../../common';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { usePutRuleset } from '../../hooks/use_put_query_rules_ruleset';
import { useRunQueryRulesetAction } from '../../hooks/use_run_query_ruleset';
import { QueryRulesPageTemplate } from '../../layout/query_rules_page_template';
import { isNotFoundError, isPermissionError } from '../../utils/query_rules_utils';
import { ErrorPrompt } from '../error_prompt/error_prompt';
import { DeleteRulesetModal } from '../query_rules_sets/delete_ruleset_modal';
import { QueryRuleDetailPanel } from './query_rule_detail_panel';
import { useQueryRulesetDetailState } from './use_query_ruleset_detail_state';
import { useFetchQueryRulesetExist } from '../../hooks/use_fetch_ruleset_exists';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { useQueryRulesBreadcrumbs } from '../../hooks/use_query_rules_breadcrumbs';

export interface QueryRulesetDetailProps {
  createMode?: boolean;
}

export const QueryRulesetDetail: React.FC<QueryRulesetDetailProps> = ({ createMode = false }) => {
  const {
    services: { application, http, history, notifications, overlays },
  } = useKibana();
  const { rulesetId = '' } = useParams<{
    rulesetId?: string;
  }>();
  useQueryRulesBreadcrumbs(rulesetId);
  const { data: rulesetExists, isLoading: isFailsafeLoading } =
    useFetchQueryRulesetExist(rulesetId);
  const useTracker = useUsageTracker();

  useEffect(() => {
    // This is a failsafe in case user navigates to an existing ruleset via URL directly
    if (createMode && rulesetExists) {
      application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${rulesetId}`));
    }
  }, [createMode, rulesetExists, application, http.basePath, rulesetId]);

  useEffect(() => {
    useTracker?.load?.(AnalyticsEvents.rulesetDetailPageLoaded);
  }, [useTracker]);

  const blockRender = (createMode && rulesetExists) || isFailsafeLoading;

  const { mutate: createRuleset } = usePutRuleset(() => {
    if (createMode) {
      application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/ruleset/${rulesetId}`));
    }
  });

  const {
    queryRuleset,
    rules,
    unfilteredRules,
    setNewRules,
    addNewRule,
    deleteRule,
    updateRule,
    isInitialLoading,
    isError,
    error,
    setSearchFilter,
    searchFilter,
  } = useQueryRulesetDetailState({
    rulesetId,
    createMode,
  });

  const isTourEnabled = notifications.tours.isEnabled();
  const TOUR_QUERY_RULES_STORAGE_KEY = 'queryRules.tour';

  const tourConfig = {
    currentTourStep: 1,
    isTourActive: true,
    tourPopoverWidth: 360,
  };

  const [tourAnchorElement, setTourAnchorElement] = useState<HTMLDivElement | null>(null);
  const tourTargetRef = useCallback((node: HTMLDivElement | null) => {
    setTourAnchorElement(node);
  }, []);

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
      tourTargetRef,
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

  const [consoleTourAnchor, setConsoleTourAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!isTourEnabled || !tourState.isTourActive) {
      return;
    }
    const findButton = () =>
      document.querySelector<HTMLElement>(
        '[data-test-subj="queryRulesetDetailTestInConsoleButton"]'
      );
    const existing = findButton();
    if (existing) {
      setConsoleTourAnchor(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const button = findButton();
      if (button) {
        setConsoleTourAnchor(button);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isTourEnabled, tourState.isTourActive]);

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

  const [rulesetToDelete, setRulesetToDelete] = useState<string | null>(null);

  const finishTour = () => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  };

  const handleSave = useCallback(() => {
    setIsFormDirty(false);
    useTracker?.click(
      createMode ? AnalyticsEvents.rulesetCreateClicked : AnalyticsEvents.rulesetUpdateClicked
    );
    createRuleset({
      rulesetId,
      forceWrite: true,
      rules: unfilteredRules,
    });
  }, [createMode, rulesetId, unfilteredRules, useTracker, createRuleset]);

  const [isFormDirty, setIsFormDirty] = useState(createMode);

  const { run: runInConsole, isAvailable: isConsoleAvailable } = useRunQueryRulesetAction({
    rulesetId,
    disabled: createMode,
    onClick: () => {
      useTracker?.click(AnalyticsEvents.testInConsoleClicked);
      finishTour();
    },
  });

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        ...(isConsoleAvailable
          ? [
              {
                id: 'testInConsole',
                label: i18n.translate('xpack.queryRules.queryRulesetDetail.testButton', {
                  defaultMessage: 'Test in Console',
                }),
                iconType: 'commandLine' as const,
                run: runInConsole,
                disableButton: createMode,
                testId: 'queryRulesetDetailTestInConsoleButton',
              },
            ]
          : []),
        {
          id: 'delete',
          label: i18n.translate('xpack.queryRules.queryRulesetDetail.deleteRulesetButton', {
            defaultMessage: 'Delete ruleset',
          }),
          iconType: 'trash',
          overflow: true,
          isDestructive: true,
          disableButton: createMode || isInitialLoading || rules.length === 0,
          run: () => setRulesetToDelete(rulesetId),
          testId: 'queryRulesetDetailDeleteButton',
        },
      ],
      primaryActionItem: {
        id: 'save',
        label: i18n.translate('xpack.queryRules.queryRulesetDetail.saveButton', {
          defaultMessage: 'Save',
        }),
        iconType: 'save',
        run: handleSave,
        disableButton: !isFormDirty || isInitialLoading || unfilteredRules.length === 0,
        testId: 'queryRulesetDetailHeaderSaveButton',
      },
    }),
    [
      isConsoleAvailable,
      runInConsole,
      createMode,
      isInitialLoading,
      rules?.length,
      isFormDirty,
      unfilteredRules?.length,
      rulesetId,
      handleSave,
    ]
  );

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
      {!isInitialLoading && !isError && !!queryRuleset && !blockRender && (
        <AppHeader
          title={rulesetId}
          back={{
            href: http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}`),
            onClick: () => useTracker?.click(AnalyticsEvents.backToRulesetListClicked),
            label: PLUGIN_TITLE,
          }}
          menu={menu}
          docLink={docLinks.queryRulesApi}
        />
      )}
      {(!blockRender && !isFailsafeLoading && isError && createMode) ||
        (!isError && (
          <>
            <QueryRuleDetailPanel
              rulesetId={rulesetId}
              setNewRules={setNewRules}
              addNewRule={addNewRule}
              deleteRule={deleteRule}
              updateRule={updateRule}
              rules={rules}
              unfilteredRules={unfilteredRules}
              tourInfo={tourStepsInfo[1]}
              setIsFormDirty={setIsFormDirty}
              createMode={createMode}
              searchFilter={searchFilter}
              setSearchFilter={setSearchFilter}
            />

            {consoleTourAnchor !== null && (
              <EuiTourStep
                anchor={consoleTourAnchor}
                content={<p>{tourStepsInfo[0].content}</p>}
                isStepOpen={
                  isTourEnabled && tourState.isTourActive && tourState.currentTourStep === 1
                }
                minWidth={tourState.tourPopoverWidth}
                onFinish={finishTour}
                step={1}
                stepsTotal={(queryRuleset?.rules?.length ?? 0) > 1 ? 2 : 1}
                title={
                  <EuiTitle size="xs">
                    <h6>{tourStepsInfo[0].title}</h6>
                  </EuiTitle>
                }
                anchorPosition="downRight"
                zIndex={1}
                footerAction={
                  <EuiFlexGroup direction="row">
                    <EuiFlexItem>
                      {(queryRuleset?.rules?.length ?? 0) > 1 ? (
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
                    {(queryRuleset?.rules?.length ?? 0) > 1 && (
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
              />
            )}

            {tourAnchorElement !== null && (
              <EuiTourStep
                anchor={tourAnchorElement}
                content={<p>{tourStepsInfo[1].content}</p>}
                isStepOpen={
                  isTourEnabled && tourState.isTourActive && tourState.currentTourStep === 2
                }
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
        ))}
      {!blockRender && rulesetToDelete && (
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
      {!blockRender && isError && !createMode && error && (
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
