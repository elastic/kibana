/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  type DataProviderType,
  DataProviderTypeEnum,
  TimelineTypeEnum,
} from '../../../../../common/api/timeline';
import type { BrowserFields } from '../../../../common/containers/source';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineSelectors } from '../../../store';
import type { PrimitiveOrArrayOfPrimitives } from '../../../../common/lib/kuery';

import type { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import type { DataProvidersAnd, QueryOperator } from './data_provider';
import { dragAndDropActions } from '../../../../common/store/drag_and_drop';

interface ProviderItemBadgeProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isPopoverOpen: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  register?: DataProvidersAnd;
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
  timelineId?: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  toggleTypeProvider: () => void;
  displayValue?: string;
  val: PrimitiveOrArrayOfPrimitives;
  type?: DataProviderType;
  wrapperRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export const ProviderItemBadge = React.memo<ProviderItemBadgeProps>(
  ({
    andProviderId,
    browserFields,
    deleteProvider,
    field,
    kqlQuery,
    isEnabled,
    isExcluded,
    isPopoverOpen,
    onDataProviderEdited,
    operator,
    providerId,
    register,
    setIsPopoverOpen,
    timelineId,
    toggleEnabledProvider,
    toggleExcludedProvider,
    toggleTypeProvider,
    displayValue,
    val,
    type = DataProviderTypeEnum.default,
    wrapperRef,
  }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timelineType = useShallowEqualSelector((state) => {
      if (!timelineId) {
        return TimelineTypeEnum.default;
      }

      return getTimeline(state, timelineId)?.timelineType ?? TimelineTypeEnum.default;
    });

    const togglePopover = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen, setIsPopoverOpen]);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
      wrapperRef?.current?.focus();
    }, [wrapperRef, setIsPopoverOpen]);

    const onToggleEnabledProvider = useCallback(() => {
      toggleEnabledProvider();
      closePopover();
    }, [closePopover, toggleEnabledProvider]);

    const onToggleExcludedProvider = useCallback(() => {
      toggleExcludedProvider();
      closePopover();
    }, [toggleExcludedProvider, closePopover]);

    const onToggleTypeProvider = useCallback(() => {
      toggleTypeProvider();
      closePopover();
    }, [toggleTypeProvider, closePopover]);

    const [providerRegistered, setProviderRegistered] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
      // optionally register the provider if provided
      if (register != null) {
        dispatch(dragAndDropActions.registerProvider({ provider: { ...register, and: [] } }));
        setProviderRegistered(true);
      }
    }, [providerRegistered, dispatch, register, setProviderRegistered]);

    const unRegisterProvider = useCallback(() => {
      if (providerRegistered && register != null) {
        dispatch(dragAndDropActions.unRegisterProvider({ id: register.id }));
      }
    }, [providerRegistered, dispatch, register]);

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      [unRegisterProvider]
    );

    const button = useMemo(
      () => (
        <ProviderBadge
          deleteProvider={deleteProvider}
          field={field}
          kqlQuery={kqlQuery}
          isEnabled={isEnabled}
          isExcluded={isExcluded}
          providerId={providerId}
          togglePopover={togglePopover}
          toggleType={onToggleTypeProvider}
          displayValue={displayValue ?? String(val)}
          val={val}
          operator={operator}
          type={type}
          timelineType={timelineType}
        />
      ),
      [
        deleteProvider,
        displayValue,
        field,
        isEnabled,
        isExcluded,
        kqlQuery,
        onToggleTypeProvider,
        operator,
        providerId,
        timelineType,
        togglePopover,
        type,
        val,
      ]
    );

    return (
      <ProviderItemActions
        andProviderId={andProviderId}
        browserFields={browserFields}
        button={button}
        closePopover={closePopover}
        deleteProvider={deleteProvider}
        field={field}
        kqlQuery={kqlQuery}
        isEnabled={isEnabled}
        isExcluded={isExcluded}
        isOpen={isPopoverOpen}
        onDataProviderEdited={onDataProviderEdited}
        operator={operator}
        providerId={providerId}
        timelineId={timelineId}
        timelineType={timelineType}
        toggleEnabledProvider={onToggleEnabledProvider}
        toggleExcludedProvider={onToggleExcludedProvider}
        toggleTypeProvider={onToggleTypeProvider}
        value={val}
        type={type}
      />
    );
  }
);

ProviderItemBadge.displayName = 'ProviderItemBadge';
