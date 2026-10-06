/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface Props {
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Dot-style tab list with roving tabindex and arrow/Home/End keyboard navigation. */
export const OnboardingPreviewTabs: React.FC<Props> = ({ activeIndex, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastIndex = i18n.PREVIEW_SLIDES.length - 1;

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: index === lastIndex ? 0 : index + 1,
      ArrowLeft: index === 0 ? lastIndex : index - 1,
      Home: 0,
      End: lastIndex,
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    onSelect(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div role="tablist" aria-label={i18n.PREVIEW_TABLIST_LABEL}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {i18n.PREVIEW_SLIDES.map((slide, index) => {
          const selected = index === activeIndex;
          return (
            <EuiFlexItem grow={false} key={slide.id}>
              <button
                type="button"
                role="tab"
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                aria-selected={selected}
                aria-label={slide.label}
                tabIndex={selected ? 0 : -1}
                data-test-subj={`alertZeroOnboardingPreviewDot-${slide.id}`}
                onClick={() => onSelect(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                css={css`
                  block-size: ${euiTheme.size.s};
                  inline-size: ${selected ? euiTheme.size.l : euiTheme.size.s};
                  transition: inline-size 0.25s cubic-bezier(0.32, 0.72, 0, 1),
                    background-color 0.25s cubic-bezier(0.32, 0.72, 0, 1);
                  border-radius: ${euiTheme.size.s};
                  border: none;
                  padding: 0;
                  cursor: pointer;
                  background-color: ${selected
                    ? euiTheme.colors.primary
                    : transparentize(euiTheme.colors.primary, 0.2)};
                `}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
