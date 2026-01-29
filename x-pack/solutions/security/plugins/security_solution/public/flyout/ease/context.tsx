/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useCreateEaseAlertsDataView } from '../../detections/hooks/alert_summary/use_create_data_view';
import { useDocumentDetails } from './hooks/use_document_details';
import { useRuleWithFallback } from '../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useSpaceId } from '../../common/hooks/use_space_id';
import type { GetFieldsData } from '../document_details/shared/hooks/use_get_fields_data';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import type { EaseDetailsProps } from './types';
import { FlyoutError } from '../shared/components/flyout_error';
import { useBasicDataFromDetailsData } from '../document_details/shared/hooks/use_basic_data_from_details_data';

export interface EaseDetailsContext {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
  /**
   * Anonymization switch state in local storage
   * If undefined, the spaceId is not retrievable and the switch is not shown
   */
  showAnonymizedValues?: boolean;
  setShowAnonymizedValues: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

/**
 * A context provider for EASE alert summary flyout
 */
export const EaseDetailsContext = createContext<EaseDetailsContext | undefined>(undefined);

export type EaseDetailsProviderProps = {
  /**
   * React components to render
   */
  children: React.ReactNode;
} & Partial<EaseDetailsProps['params']>;

export const EaseDetailsProvider = memo(({ id, children }: EaseDetailsProviderProps) => {
  const { dataView } = useCreateEaseAlertsDataView();

  const spaceId = useSpaceId();
  const { dataAsNestedObject, dataFormattedForFieldBrowser, getFieldsData, loading } =
    useDocumentDetails({
      dataView,
      documentId: id,
    });

  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);

  const [showAnonymizedValues = spaceId ? false : undefined, setShowAnonymizedValues] =
    useLocalStorage<boolean | undefined>(
      `securitySolution.aiAlertFlyout.showAnonymization.${spaceId}`
    );

  const contextValue = useMemo(
    () =>
      dataFormattedForFieldBrowser && dataAsNestedObject && id && dataView
        ? {
            dataFormattedForFieldBrowser,
            dataAsNestedObject,
            eventId: id,
            getFieldsData,
            investigationFields: maybeRule?.investigation_fields?.field_names ?? [],
            setShowAnonymizedValues,
            showAnonymizedValues,
          }
        : undefined,
    [
      dataAsNestedObject,
      dataFormattedForFieldBrowser,
      dataView,
      getFieldsData,
      id,
      maybeRule,
      setShowAnonymizedValues,
      showAnonymizedValues,
    ]
  );

  if (loading) {
    return <FlyoutLoading />;
  }

  if (!contextValue) {
    return <FlyoutError />;
  }

  return <EaseDetailsContext.Provider value={contextValue}>{children}</EaseDetailsContext.Provider>;
});

EaseDetailsProvider.displayName = 'EaseDetailsProvider';

export const useEaseDetailsContext = (): EaseDetailsContext => {
  const contextValue = useContext(EaseDetailsContext);

  if (!contextValue) {
    throw new Error('EaseDetailsContext can only be used within EaseDetailsContext provider');
  }

  return contextValue;
};
