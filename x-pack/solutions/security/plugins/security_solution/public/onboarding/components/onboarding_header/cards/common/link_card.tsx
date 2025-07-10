/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import classNames from 'classnames';
import { useCardStyles } from './link_card.styles';
import type { OnboardingHeaderCardId } from '../../constants';
import { TELEMETRY_HEADER_CARD } from '../../constants';
import { useOnboardingContext } from '../../../onboarding_context';

interface LinkCardProps {
  id: OnboardingHeaderCardId;
  icon: string;
  title: string;
  description: string;
  linkText: string;
  onClick?: () => void;
  href?: string;
  target?: string;
}

export const LinkCard: React.FC<LinkCardProps> = React.memo(
  ({ id, icon, title, description, onClick, href, target, linkText }) => {
    const cardStyles = useCardStyles();
    const cardClassName = classNames(cardStyles, 'headerCard');
    const {
      telemetry: { reportLinkClick },
    } = useOnboardingContext();
    const onClickWithReport = useCallback<React.MouseEventHandler>(() => {
      reportLinkClick?.(`${TELEMETRY_HEADER_CARD}_${id}`);
      onClick?.();
    }, [id, onClick, reportLinkClick]);

    const panelTitleId = useGeneratedHtmlId();

    return (
      <EuiCard
        className={cardClassName}
        onClick={onClickWithReport}
        href={href}
        target={target}
        data-test-subj="data-ingestion-header-card"
        layout="horizontal"
        aria-labelledby={panelTitleId}
        icon={
          <EuiImage
            data-test-subj="data-ingestion-header-card-icon"
            src={icon}
            alt={title}
            size={64}
          />
        }
        title={
          <span id={panelTitleId} className="headerCardTitle">
            {title}
          </span>
        }
        description={<EuiText size="xs">{description}</EuiText>}
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" className="headerCardLink" component="span">
              <span data-test-subj="headerCardLink">{linkText}</span>
            </EuiText>
          </EuiFlexItem>
          {target === '_blank' && (
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="popout" color="primary" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiCard>
    );
  }
);

LinkCard.displayName = 'LinkCard';
