/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
  type FunnelStepDef,
  type FunnelStepType,
} from '../../../common/session_funnel';

const typeOptions = [
  {
    id: 'page',
    label: i18n.translate('xpack.ux.goals.stepTypePageAriaLabel', { defaultMessage: 'Page' }),
    iconType: 'document',
  },
  {
    id: 'activity',
    label: i18n.translate('xpack.ux.goals.stepTypeActivityAriaLabel', {
      defaultMessage: 'Click',
    }),
    iconType: 'tokenEvent',
  },
];

export function ConversionGoalSequence({
  steps,
  onChange,
}: {
  steps: FunnelStepDef[];
  onChange: (steps: FunnelStepDef[]) => void;
}) {
  const { euiTheme } = useEuiTheme();

  const updateStep = (index: number, patch: Partial<FunnelStepDef>) => {
    onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) {
      return;
    }
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const addStep = () => {
    if (steps.length >= FUNNEL_MAX_STEPS) {
      return;
    }
    onChange([...steps, { type: 'page', value: '', label: '' }]);
  };

  const railCss = css`
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    column-gap: ${euiTheme.size.s};
    row-gap: ${euiTheme.size.l};
    min-width: 0;
    width: 100%;
    max-width: 100%;
    padding: ${euiTheme.size.xs} 0 ${euiTheme.size.s};
  `;

  return (
    <div css={railCss} data-test-subj="uxGoalSequence">
      {steps.map((step, index) => (
        <React.Fragment key={`goal-step-${index}`}>
          {index > 0 && (
            <EuiFlexGroup
              alignItems="center"
              justifyContent="center"
              gutterSize="none"
              responsive={false}
              css={css`
                flex: 0 0 auto;
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <EuiIcon type="sortRight" color="subdued" aria-hidden={true} />
            </EuiFlexGroup>
          )}
          <StepCard
            step={step}
            index={index}
            total={steps.length}
            onChange={(patch) => updateStep(index, patch)}
            onMoveLeft={() => moveStep(index, index - 1)}
            onMoveRight={() => moveStep(index, index + 1)}
            onRemove={() => onChange(steps.filter((_, i) => i !== index))}
            onAddAfter={index === steps.length - 1 ? addStep : undefined}
          />
        </React.Fragment>
      ))}
      {steps.length < FUNNEL_MAX_STEPS && (
        <>
          {steps.length > 0 && (
            <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
              <EuiIcon type="sortRight" color="subdued" aria-hidden={true} />
            </EuiFlexGroup>
          )}
          <AddStepCard onClick={addStep} />
        </>
      )}
    </div>
  );
}

function StepCard({
  step,
  index,
  total,
  onChange,
  onMoveLeft,
  onMoveRight,
  onRemove,
  onAddAfter,
}: {
  step: FunnelStepDef;
  index: number;
  total: number;
  onChange: (patch: Partial<FunnelStepDef>) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onAddAfter?: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const isActivity = step.type === 'activity';
  const accent = isActivity ? euiTheme.colors.accent : euiTheme.colors.primary;

  const cardCss = css`
    flex: 1 1 200px;
    min-width: 180px;
    max-width: 240px;
    padding: ${euiTheme.size.s};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-top: ${euiTheme.size.xs} solid ${accent};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  const badgeCss = css`
    width: ${euiTheme.size.l};
    height: ${euiTheme.size.l};
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${accent};
    color: ${euiTheme.colors.emptyShade};
    font-size: ${euiTheme.size.s};
    font-weight: 700;
  `;

  return (
    <div css={cardCss} data-test-subj={`uxGoalStep-${index}`}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <span css={badgeCss} aria-hidden={true}>
            {index + 1}
          </span>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonGroup
            legend={i18n.translate('xpack.ux.goals.stepTypeLegend', {
              defaultMessage: 'Step type',
            })}
            options={typeOptions}
            idSelected={step.type}
            onChange={(id) => onChange({ type: id as FunnelStepType })}
            buttonSize="compressed"
            isIconOnly
            data-test-subj={`uxGoalStepType-${index}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ux.goals.moveStepEarlierTooltip', {
              defaultMessage: 'Move earlier',
            })}
          >
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.ux.goals.moveStepEarlierAriaLabel', {
                defaultMessage: 'Move earlier',
              })}
              iconType="chevronSingleLeft"
              size="s"
              disabled={index === 0}
              onClick={onMoveLeft}
              data-test-subj={`uxGoalMoveEarlier-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ux.goals.moveStepLaterTooltip', {
              defaultMessage: 'Move later',
            })}
          >
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.ux.goals.moveStepLaterAriaLabel', {
                defaultMessage: 'Move later',
              })}
              iconType="chevronSingleRight"
              size="s"
              disabled={index === total - 1}
              onClick={onMoveRight}
              data-test-subj={`uxGoalMoveLater-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ux.goals.removeStepTooltip', {
              defaultMessage: 'Remove step',
            })}
          >
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.ux.goals.removeStepAriaLabel', {
                defaultMessage: 'Remove step',
              })}
              iconType="trash"
              color="danger"
              size="s"
              disabled={total <= FUNNEL_MIN_STEPS}
              onClick={onRemove}
              data-test-subj={`uxGoalRemoveStep-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        <EuiFieldText
          compressed
          value={step.value}
          maxLength={FUNNEL_STEP_VALUE_MAX_LENGTH}
          prepend={
            <EuiIcon type={isActivity ? 'tokenEvent' : 'document'} size="s" aria-hidden={true} />
          }
          placeholder={
            isActivity
              ? i18n.translate('xpack.ux.goals.activityPlaceholder', {
                  defaultMessage: 'Checkout',
                })
              : i18n.translate('xpack.ux.goals.pagePlaceholder', {
                  defaultMessage: 'catalog',
                })
          }
          onChange={(event) => onChange({ value: event.target.value, label: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onAddAfter) {
              event.preventDefault();
              onAddAfter();
            }
          }}
          data-test-subj={`uxGoalStepValue-${index}`}
        />
      </div>
      <EuiText size="xs" color="subdued">
        {isActivity
          ? i18n.translate('xpack.ux.goals.activityHintLabel', {
              defaultMessage: 'Click or activity',
            })
          : i18n.translate('xpack.ux.goals.pageHintLabel', {
              defaultMessage: 'Page path',
            })}
      </EuiText>
    </div>
  );
}

function AddStepCard({ onClick }: { onClick: () => void }) {
  const { euiTheme } = useEuiTheme();
  const cardCss = css`
    flex: 0 1 140px;
    min-width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  return (
    <div css={cardCss}>
      <EuiButtonEmpty
        data-test-subj="uxGoalAddStepButton"
        size="s"
        iconType="plusCircle"
        onClick={onClick}
      >
        {i18n.translate('xpack.ux.goals.addStepButtonLabel', { defaultMessage: 'Add step' })}
      </EuiButtonEmpty>
    </div>
  );
}
