/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { isPlaceholderRumBudgetKql } from '../../../../common/rum_budget_kql';
import {
  buildRumBudgetSlo,
  defaultBudgetName,
  isRumBudgetAiTemplate,
  isRumSessionBudgetTemplate,
  rumBudgetHasThreshold,
  RUM_BUDGET_TEMPLATE_IDS,
  rumBudgetDefaults,
  rumBudgetTemplateDescription,
  rumBudgetTemplateLabel,
  rumBudgetThresholdUnit,
  type RumBudgetScope,
  type RumBudgetTemplateId,
} from '../../../../common/rum_budgets';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import { fetchRumAlertStatus } from '../../../services/rest/rum_alerts_api';
import { fetchRumAnalyticsStatus } from '../../../services/rest/rum_analytics_api';
import { createRumBudget, generateRumBudgetKql } from '../../../services/rest/rum_budgets_api';
import type { RumBudgetDraft } from './budget_flyout_context';

const httpErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as { body?: { message?: string } }).body;
    if (body?.message) {
      return body.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return String(err);
};

export function CreateBudgetFlyout({
  draft,
  onClose,
  onCreated,
}: {
  draft: RumBudgetDraft;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { http, notifications } = useKibanaServices();
  const { euiTheme } = useEuiTheme();
  const session = useUxFlyoutSession();
  const {
    urlParams: { serviceName, pageUrl },
  } = useLegacyUrlParams();
  const currentPage = draft.pageUrl || pageUrl;
  const defaults = rumBudgetDefaults(draft.templateId);
  const [templateId, setTemplateId] = useState<RumBudgetTemplateId>(draft.templateId);
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(draft.threshold ?? defaults.threshold);
  const [targetPercent, setTargetPercent] = useState(95);
  const [scope, setScope] = useState<RumBudgetScope>(currentPage ? 'page' : 'app');
  const [alert, setAlert] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFilter, setAiFilter] = useState('');
  const [aiGood, setAiGood] = useState('');
  const [aiIndex, setAiIndex] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [sessionAnalyticsReady, setSessionAnalyticsReady] = useState(false);

  const filters = useMemo(
    () => ({
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      pageUrl: currentPage,
    }),
    [currentPage, serviceName]
  );

  useEffect(() => {
    const next = rumBudgetDefaults(templateId);
    setThreshold(
      draft.templateId === templateId && draft.threshold != null ? draft.threshold : next.threshold
    );
  }, [draft.templateId, draft.threshold, templateId]);

  const isAi = isRumBudgetAiTemplate(templateId);

  const built = useMemo(
    () =>
      buildRumBudgetSlo({
        templateId,
        name,
        threshold,
        target: targetPercent / 100,
        scope,
        filters,
        prompt: aiPrompt,
        filter: isAi ? aiFilter : undefined,
        good: isAi ? aiGood : undefined,
        index: isAi && aiIndex ? aiIndex : undefined,
      }),
    [
      aiFilter,
      aiGood,
      aiIndex,
      aiPrompt,
      filters,
      isAi,
      name,
      scope,
      targetPercent,
      templateId,
      threshold,
    ]
  );

  useEffect(() => {
    void (async () => {
      try {
        const [status, analytics] = await Promise.all([
          fetchRumAlertStatus(http),
          fetchRumAnalyticsStatus({ http }),
        ]);
        setAiAvailable(status.aiAvailable !== false);
        setSessionAnalyticsReady(Boolean(analytics.installed && analytics.watermark));
      } catch {
        setAiAvailable(false);
        setSessionAnalyticsReady(false);
      }
    })();
  }, [http]);

  useEffect(() => {
    if (isRumSessionBudgetTemplate(templateId) && scope === 'groupByPage') {
      setScope('app');
    }
  }, [scope, templateId]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateRumBudgetKql(http, { prompt: aiPrompt.trim(), filters });
      setAiFilter(result.filter);
      setAiGood(result.good);
      setAiIndex(result.index);
      if (!name.trim()) {
        setName(result.description.slice(0, 80));
      }
    } catch (err) {
      const message = httpErrorMessage(err);
      setError(message);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.budgets.create.generateFailedTitle', {
          defaultMessage: 'Unable to generate KQL',
        }),
        text: message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (scope === 'page' && !filters.pageUrl) {
      setError(
        i18n.translate('xpack.ux.budgets.create.pageRequiredErrorMessage', {
          defaultMessage: 'Select a page in the filter bar before scoping the budget to one route.',
        })
      );
      return;
    }
    if (isAi && isPlaceholderRumBudgetKql(built.filter, built.good)) {
      setError(
        i18n.translate('xpack.ux.budgets.create.aiKqlRequiredErrorMessage', {
          defaultMessage: 'Generate KQL before creating this budget.',
        })
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await createRumBudget(
        http,
        {
          templateId,
          name:
            name.trim() ||
            defaultBudgetName({
              templateId,
              threshold,
              target: built.target,
              scope,
              filters,
              prompt: aiPrompt,
              filter: aiFilter,
              good: aiGood,
              index: aiIndex,
            }),
          threshold,
          target: built.target,
          scope,
          filters,
          prompt: isAi ? aiPrompt : undefined,
          filter: isAi ? aiFilter : undefined,
          good: isAi ? aiGood : undefined,
          index: isAi && aiIndex ? aiIndex : undefined,
        },
        { alert }
      );
      notifications.toasts.addSuccess(
        result.alertCreated || !alert
          ? i18n.translate('xpack.ux.budgets.create.successToast', {
              defaultMessage: 'Budget created',
            })
          : i18n.translate('xpack.ux.budgets.create.successNoAlertToast', {
              defaultMessage: 'Budget created. Burn-rate alert could not be created.',
            })
      );
      onCreated();
    } catch (err) {
      setError(httpErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unit = rumBudgetThresholdUnit(templateId);
  const flyoutTitle = i18n.translate('xpack.ux.budgets.create.title', {
    defaultMessage: 'Create performance budget',
  });

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title: flyoutTitle, size: 'l', session })}
      onClose={onClose}
      aria-labelledby="uxCreateBudgetFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="uxCreateBudgetFlyoutTitle">{flyoutTitle}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.budgets.create.subtitleDescription', {
              defaultMessage:
                'Pick a template. The app writes the SLO (percent good over 30 days) and can attach a burn-rate alert.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('xpack.ux.budgets.create.errorTitle', {
              defaultMessage: 'Unable to create budget',
            })}
          >
            <p>{error}</p>
          </EuiCallOut>
        )}
        <EuiForm component="form">
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.budgets.create.templateTitle', {
                  defaultMessage: 'Template',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {!sessionAnalyticsReady && (
              <>
                <EuiCallOut
                  announceOnMount
                  color="primary"
                  size="s"
                  title={i18n.translate('xpack.ux.budgets.create.sessionAnalyticsTitle', {
                    defaultMessage: 'Session-outcome budgets need session analytics',
                  })}
                >
                  <p>
                    {i18n.translate('xpack.ux.budgets.create.sessionAnalyticsDescription', {
                      defaultMessage:
                        'Enable session analytics in Capture settings so error-free, rage-free, and bounce-free budgets can read the session index.',
                    })}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}
            <div
              css={css`
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${euiTheme.size.s};
                .euiCheckableCard {
                  height: 100%;
                }
              `}
            >
              {RUM_BUDGET_TEMPLATE_IDS.map((id) => (
                <EuiCheckableCard
                  key={id}
                  id={`ux-budget-template-${id}`}
                  name="ux-budget-template"
                  label={rumBudgetTemplateLabel(id)}
                  checked={templateId === id}
                  disabled={isRumSessionBudgetTemplate(id) && !sessionAnalyticsReady}
                  onChange={() => setTemplateId(id)}
                >
                  <EuiText size="xs" color="subdued">
                    {rumBudgetTemplateDescription(id)}
                  </EuiText>
                </EuiCheckableCard>
              ))}
            </div>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.budgets.create.contractTitle', {
                  defaultMessage: 'Contract',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.budgets.create.nameLabel', {
                defaultMessage: 'Name',
              })}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="uxBudgetName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={defaultBudgetName({
                  templateId,
                  threshold,
                  target: built.target,
                  scope,
                  filters,
                  prompt: aiPrompt,
                })}
              />
            </EuiFormRow>
            {isAi && (
              <>
                {!aiAvailable && (
                  <EuiCallOut
                    announceOnMount
                    color="warning"
                    size="s"
                    title={i18n.translate('xpack.ux.budgets.create.aiUnavailableTitle', {
                      defaultMessage: 'GenAI is not available',
                    })}
                  >
                    <p>
                      {i18n.translate('xpack.ux.budgets.create.aiUnavailableDescription', {
                        defaultMessage:
                          'Configure a Kibana inference connector to generate KQL from a description.',
                      })}
                    </p>
                  </EuiCallOut>
                )}
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('xpack.ux.budgets.create.aiPromptLabel', {
                    defaultMessage: 'Contract in plain language',
                  })}
                  helpText={i18n.translate('xpack.ux.budgets.create.aiPromptHelpText', {
                    defaultMessage:
                      'Example: 95% of checkout page loads finish in under 2 seconds.',
                  })}
                >
                  <EuiTextArea
                    fullWidth
                    data-test-subj="uxBudgetAiPrompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </EuiFormRow>
                <EuiFormRow>
                  <EuiButton
                    data-test-subj="uxBudgetAiGenerate"
                    isLoading={generating}
                    disabled={!aiPrompt.trim() || !aiAvailable}
                    onClick={() => void generate()}
                  >
                    {i18n.translate('xpack.ux.budgets.create.generateKqlButtonLabel', {
                      defaultMessage: 'Generate KQL',
                    })}
                  </EuiButton>
                </EuiFormRow>
                {aiFilter && (
                  <>
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate('xpack.ux.budgets.create.aiFilterLabel', {
                        defaultMessage: 'Population (filter)',
                      })}
                    >
                      <EuiTextArea
                        fullWidth
                        data-test-subj="uxBudgetAiFilter"
                        value={aiFilter}
                        onChange={(event) => setAiFilter(event.target.value)}
                        rows={2}
                      />
                    </EuiFormRow>
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate('xpack.ux.budgets.create.aiGoodLabel', {
                        defaultMessage: 'Good events',
                      })}
                    >
                      <EuiTextArea
                        fullWidth
                        data-test-subj="uxBudgetAiGood"
                        value={aiGood}
                        onChange={(event) => setAiGood(event.target.value)}
                        rows={2}
                      />
                    </EuiFormRow>
                  </>
                )}
              </>
            )}
            {rumBudgetHasThreshold(templateId) && (
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.ux.budgets.create.thresholdLabel', {
                  defaultMessage: 'Good if {unit}',
                  values: { unit: unit === 'ms' ? '≤ ms' : '≤ score' },
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  data-test-subj="uxBudgetThreshold"
                  value={threshold}
                  min={0}
                  step={templateId === 'cls' ? 0.01 : 1}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                />
              </EuiFormRow>
            )}
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.budgets.create.targetLabel', {
                defaultMessage: 'Target (30-day rolling)',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxBudgetTarget"
                options={[
                  {
                    value: '95',
                    text: i18n.translate('xpack.ux.budgets.create.target95DropDownOptionLabel', {
                      defaultMessage: '95% good',
                    }),
                  },
                  {
                    value: '99',
                    text: i18n.translate('xpack.ux.budgets.create.target99DropDownOptionLabel', {
                      defaultMessage: '99% good (critical)',
                    }),
                  },
                ]}
                value={String(targetPercent)}
                onChange={(event) => setTargetPercent(Number(event.target.value))}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.budgets.create.scopeLabel', {
                defaultMessage: 'Scope',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxBudgetScope"
                options={[
                  {
                    value: 'app',
                    text: i18n.translate('xpack.ux.budgets.create.scopeAppDropDownOptionLabel', {
                      defaultMessage: 'Whole app',
                    }),
                  },
                  {
                    value: 'page',
                    text: i18n.translate('xpack.ux.budgets.create.scopePageDropDownOptionLabel', {
                      defaultMessage: 'Current page',
                    }),
                    disabled: !filters.pageUrl,
                  },
                  {
                    value: 'groupByPage',
                    text: i18n.translate('xpack.ux.budgets.create.scopeGroupDropDownOptionLabel', {
                      defaultMessage: 'Each page (group by path)',
                    }),
                    disabled: isRumSessionBudgetTemplate(templateId),
                  },
                ]}
                value={scope}
                onChange={(event) => setScope(event.target.value as RumBudgetScope)}
              />
            </EuiFormRow>
            {scope === 'groupByPage' && (
              <EuiCallOut
                announceOnMount
                color="warning"
                size="s"
                title={i18n.translate('xpack.ux.budgets.create.cardinalityTitle', {
                  defaultMessage: 'High-cardinality paths',
                })}
              >
                <p>
                  {i18n.translate('xpack.ux.budgets.create.cardinalityDescription', {
                    defaultMessage:
                      'One SLO instance is created per URL path. Prefer an explicit page if the site has many unique routes.',
                  })}
                </p>
              </EuiCallOut>
            )}
            <EuiSpacer size="m" />
            <EuiSwitch
              data-test-subj="uxBudgetAlert"
              label={i18n.translate('xpack.ux.budgets.create.alertToggleSwitch', {
                defaultMessage: 'Alert when the budget burns fast',
              })}
              checked={alert}
              onChange={(event) => setAlert(event.target.checked)}
            />
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.ux.budgets.create.alertHelpDescription', {
                  defaultMessage:
                    'Creates the standard 30-day SLO burn-rate rule (1h/5m at 14.4× through 72h/6h at 1×).',
                })}
              </p>
            </EuiText>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.budgets.create.previewTitle', {
                  defaultMessage: 'SLO definition',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.ux.budgets.create.previewDescription', {
                  defaultMessage: 'Custom KQL indicator on {index}.',
                  values: { index: built.slo.indicator.params.index },
                })}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="kql" fontSize="s" paddingSize="s" isCopyable>
              {`filter: ${built.filter}\ngood: ${built.good}`}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="uxBudgetCancel" onClick={onClose}>
              {i18n.translate('xpack.ux.budgets.create.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxBudgetSave"
              fill
              isLoading={saving}
              disabled={
                (isAi && isPlaceholderRumBudgetKql(built.filter, built.good)) ||
                (isRumSessionBudgetTemplate(templateId) && !sessionAnalyticsReady)
              }
              onClick={() => void save()}
            >
              {i18n.translate('xpack.ux.budgets.create.saveButtonLabel', {
                defaultMessage: 'Create budget',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
