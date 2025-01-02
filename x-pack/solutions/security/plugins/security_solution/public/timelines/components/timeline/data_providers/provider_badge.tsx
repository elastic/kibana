/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import classNames from 'classnames';
import { isString } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import type { PrimitiveOrArrayOfPrimitives } from '../../../../common/lib/kuery';
import {
  type DataProviderType,
  DataProviderTypeEnum,
  type TimelineType,
  TimelineTypeEnum,
} from '../../../../../common/api/timeline';
import { getEmptyString } from '../../../../common/components/empty_value';
import { ProviderContainer } from '../../../../common/components/drag_and_drop/provider_container';

import type { QueryOperator } from './data_provider';
import { EXISTS_OPERATOR, IS_ONE_OF_OPERATOR } from './data_provider';

import * as i18n from './translations';

type ProviderBadgeStyledType = typeof EuiBadge & {
  // https://styled-components.com/docs/api#transient-props
  $timelineType: TimelineType;
};

const ProviderBadgeStyled = styled(EuiBadge)<ProviderBadgeStyledType>`
  .euiToolTipAnchor {
    &::after {
      font-style: normal;
      content: '|';
      padding: 0px 3px;
    }
  }

  &.globalFilterItem {
    white-space: nowrap;
    min-width: ${({ $timelineType }) =>
      $timelineType === TimelineTypeEnum.template ? '140px' : 'none'};
    display: flex;

    &.globalFilterItem-isDisabled {
      text-decoration: line-through;
      font-weight: 400;
      font-style: italic;
    }

    &.globalFilterItem-isError {
      box-shadow: 0 1px 1px -1px rgba(152, 162, 179, 0.2), 0 3px 2px -2px rgba(152, 162, 179, 0.2),
        inset 0 0 0 1px #bd271e;
    }
  }
`;

ProviderBadgeStyled.displayName = 'ProviderBadgeStyled';

const ProviderFieldBadge = styled.div`
  display: block;
  color: #fff;
  padding: 6px 8px;
  font-size: 0.6em;
`;

const StyledTemplateFieldBadge = styled(ProviderFieldBadge)`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  text-transform: uppercase;
`;

interface TemplateFieldBadgeProps {
  type: DataProviderType;
  toggleType: () => void;
}

const ConvertFieldBadge = styled(ProviderFieldBadge)`
  background: ${({ theme }) => theme.eui.euiColorDarkShade};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const TemplateFieldBadgeComponent: React.FC<TemplateFieldBadgeProps> = ({ type, toggleType }) => {
  if (type !== DataProviderTypeEnum.template) {
    return (
      <ConvertFieldBadge onClick={toggleType}>{i18n.CONVERT_TO_TEMPLATE_FIELD}</ConvertFieldBadge>
    );
  }

  return <StyledTemplateFieldBadge>{i18n.TEMPLATE_FIELD_LABEL}</StyledTemplateFieldBadge>;
};

const TemplateFieldBadge = React.memo(TemplateFieldBadgeComponent);

interface ProviderBadgeProps {
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  providerId: string;
  togglePopover: () => void;
  toggleType: () => void;
  displayValue: string;
  val: PrimitiveOrArrayOfPrimitives;
  operator: QueryOperator;
  type: DataProviderType;
  timelineType: TimelineType;
}

const closeButtonProps = {
  // Removing tab focus on close button because the same option can be obtained through the context menu
  // TODO: add a `DEL` keyboard press functionality
  tabIndex: -1,
};

export const ProviderBadge = React.memo<ProviderBadgeProps>(
  ({
    deleteProvider,
    field,
    isEnabled,
    isExcluded,
    operator,
    providerId,
    togglePopover,
    toggleType,
    displayValue,
    val,
    type,
    timelineType,
  }) => {
    const deleteFilter: React.MouseEventHandler<HTMLButtonElement> = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Make sure it doesn't also trigger the onclick for the whole badge
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        deleteProvider();
      },
      [deleteProvider]
    );

    const classes = useMemo(
      () =>
        classNames('globalFilterItem', {
          'globalFilterItem-isDisabled': !isEnabled,
          'globalFilterItem-isExcluded': isExcluded,
        }),
      [isEnabled, isExcluded]
    );

    const formattedValue = useMemo(
      () => (isString(val) && val === '' ? getEmptyString() : val),
      [val]
    );

    const prefix = useMemo(() => (isExcluded ? <span>{i18n.NOT} </span> : null), [isExcluded]);

    const content = useMemo(
      () => (
        <>
          {prefix}
          {operator !== EXISTS_OPERATOR ? (
            <span className="field-value">{`${field}: "${
              operator === 'includes' ? displayValue : formattedValue
            }"`}</span>
          ) : (
            <span className="field-value">
              {field} {i18n.EXISTS_LABEL}
            </span>
          )}
        </>
      ),
      [displayValue, field, formattedValue, operator, prefix]
    );

    const ariaLabel = useMemo(
      () => i18n.SHOW_OPTIONS_DATA_PROVIDER({ field, value: `${formattedValue}` }),
      [field, formattedValue]
    );

    return (
      <ProviderContainer id={`${providerId}-${field}-${val}`}>
        <>
          <ProviderBadgeStyled
            className={classes}
            color="hollow"
            title=""
            iconOnClick={deleteFilter}
            iconOnClickAriaLabel={i18n.REMOVE_DATA_PROVIDER}
            iconType="cross"
            iconSide="right"
            onClick={togglePopover}
            onClickAriaLabel={ariaLabel}
            closeButtonProps={closeButtonProps}
            data-test-subj="providerBadge"
            $timelineType={timelineType}
          >
            {content}
          </ProviderBadgeStyled>

          {/* Add a UI feature to let users know the is one of operator doesnt work with timeline templates:
          https://github.com/elastic/kibana/issues/142437 */}

          {timelineType === TimelineTypeEnum.template && operator !== IS_ONE_OF_OPERATOR && (
            <TemplateFieldBadge toggleType={toggleType} type={type} />
          )}
        </>
      </ProviderContainer>
    );
  }
);

ProviderBadge.displayName = 'ProviderBadge';
