/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { InstructionMode } from '../automation_form_values';

const labels = {
  instructions: i18n.translate('xpack.nightshift.automations.flyout.instructions', {
    defaultMessage: 'Instructions',
  }),
  mode: i18n.translate('xpack.nightshift.automations.flyout.instructionMode', {
    defaultMessage: 'Instruction mode',
  }),
  ariaLabel: i18n.translate('xpack.nightshift.automations.flyout.instructionsAriaLabel', {
    defaultMessage: 'Automation instructions',
  }),
};

const modes: Record<
  InstructionMode,
  {
    label: string;
    help: string;
    placeholder: string;
    icon: string;
    color: 'accentSecondary' | 'primary';
    accent: 'textAccentSecondary' | 'textPrimary';
  }
> = {
  ask: {
    label: i18n.translate('xpack.nightshift.automations.flyout.askMode', { defaultMessage: 'Ask' }),
    help: i18n.translate('xpack.nightshift.automations.flyout.askModeHelp', {
      defaultMessage: 'Get direct answers and explanations without running a deep investigation.',
    }),
    placeholder: i18n.translate('xpack.nightshift.automations.flyout.askPlaceholder', {
      defaultMessage: 'Ask a question when this automation runs…',
    }),
    icon: 'comment',
    color: 'accentSecondary',
    accent: 'textAccentSecondary',
  },
  investigate: {
    label: i18n.translate('xpack.nightshift.automations.flyout.investigateMode', {
      defaultMessage: 'Investigate',
    }),
    help: i18n.translate('xpack.nightshift.automations.flyout.investigateModeHelp', {
      defaultMessage: 'Search and reason over context to trace issues and surface likely causes.',
    }),
    placeholder: i18n.translate('xpack.nightshift.automations.flyout.investigatePlaceholder', {
      defaultMessage:
        'Describe how Nightshift should investigate and respond when this automation runs…',
    }),
    icon: 'reporter',
    color: 'primary',
    accent: 'textPrimary',
  },
};

const MAX_HEIGHT = 260;

export const AutomationInstructions = ({
  instructions,
  mode,
  onInstructionsChange,
  onModeChange,
}: {
  instructions: string;
  mode: InstructionMode;
  onInstructionsChange: (instructions: string) => void;
  onModeChange: (mode: InstructionMode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const current = modes[mode];
  const accent = euiTheme.colors[current.accent];

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [instructions]);

  return (
    <>
      <EuiTitle size="xs">
        <h3>{labels.instructions}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div
        css={css`
          position: relative;
          border: ${euiTheme.border.width.thin} solid
            color-mix(in srgb, ${accent} 28%, ${euiTheme.border.color});
          border-radius: ${euiTheme.size.m};
          background: ${euiTheme.colors.backgroundBasePlain};
          transition: border-color ${euiTheme.animation.fast} ease-in-out;
          &:focus-within {
            border-color: ${accent};
          }
        `}
      >
        <textarea
          ref={textareaRef}
          rows={3}
          aria-label={labels.ariaLabel}
          placeholder={current.placeholder}
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
          css={css`
            display: block;
            box-sizing: border-box;
            width: 100%;
            border: none;
            border-radius: inherit;
            outline: none;
            resize: none;
            padding: ${euiTheme.size.s} ${euiTheme.size.s}
              calc(${euiTheme.size.s} * 2 + ${euiTheme.size.xl});
            background: transparent;
            color: ${euiTheme.colors.textParagraph};
            font: inherit;
            line-height: 1.5;
            &::placeholder {
              color: ${euiTheme.colors.textSubdued};
            }
          `}
          data-test-subj="automationInstructions"
        />
        <div
          css={css`
            position: absolute;
            inset-block-end: ${euiTheme.size.s};
            inset-inline-start: ${euiTheme.size.s};
          `}
        >
          <EuiPopover
            aria-label={labels.mode}
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            button={
              <EuiButton
                size="s"
                color={current.color}
                iconType={current.icon}
                onClick={() => setIsOpen((open) => !open)}
                data-test-subj="automationInstructionMode"
              >
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                  component="span"
                >
                  <EuiFlexItem grow={false} component="span">
                    {current.label}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} component="span">
                    <EuiIcon type="chevronSingleDown" size="s" aria-hidden={true} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiButton>
            }
          >
            <EuiContextMenuPanel
              css={{ inlineSize: 300 }}
              items={(Object.keys(modes) as InstructionMode[]).map((key) => (
                <EuiContextMenuItem
                  key={key}
                  icon={key === mode ? 'check' : 'empty'}
                  layoutAlign="top"
                  onClick={() => {
                    onModeChange(key);
                    setIsOpen(false);
                  }}
                  data-test-subj={`automationInstructionMode-${key}`}
                >
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    component="span"
                  >
                    <EuiFlexItem grow={false} component="span">
                      <EuiIcon type={modes[key].icon} size="s" aria-hidden={true} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} component="span">
                      <strong>{modes[key].label}</strong>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText size="xs" color="subdued">
                    {modes[key].help}
                  </EuiText>
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </div>
      </div>
    </>
  );
};
