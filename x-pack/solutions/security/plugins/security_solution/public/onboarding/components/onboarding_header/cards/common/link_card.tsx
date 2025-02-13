/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCard, EuiImage, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import classNames from 'classnames';
import { trackOnboardingLinkClick } from '../../../lib/telemetry';
import { useCardStyles } from './link_card.styles';
import type { OnboardingHeaderCardId } from '../../constants';
import { TELEMETRY_HEADER_CARD } from '../../constants';

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

    const onClickWithReport = useCallback<React.MouseEventHandler>(() => {
      trackOnboardingLinkClick(`${TELEMETRY_HEADER_CARD}_${id}`);
      onClick?.();
    }, [id, onClick]);

    return (
      <EuiCard
        className={cardClassName}
        onClick={onClickWithReport}
        href={href}
        target={target}
        data-test-subj="data-ingestion-header-card"
        layout="horizontal"
        icon={
          <EuiImage
            data-test-subj="data-ingestion-header-card-icon"
            src={icon}
            alt={title}
            size={64}
          />
        }
        title={<span className="headerCardTitle">{title}</span>}
        description={<EuiText size="xs">{description}</EuiText>}
      >
        <EuiSpacer size="s" />
        <EuiText size="xs" className="headerCardLink">
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiLink data-test-subj="headerCardLink" href={href} onClick={onClick} target={target}>
            {linkText}
          </EuiLink>
        </EuiText>
      </EuiCard>
    );
  }
);

LinkCard.displayName = 'LinkCard';
