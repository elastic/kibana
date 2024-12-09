/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  ActionTypeRegistryContract,
  ActionVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UseArray } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { RuleObjectId } from '../../../../../common/api/detection_engine/model/rule_schema';
import { ResponseActionsForm } from '../../../rule_response_actions/response_actions_form';
import type {
  RuleStepProps,
  ActionsStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';
import { Form, UseField } from '../../../../shared_imports';
import type { FormHook } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { RuleActionsField } from '../rule_actions_field';
import { useKibana } from '../../../../common/lib/kibana';
import { useFetchConnectorsQuery } from '../../../rule_management/api/hooks/use_fetch_connectors_query';
import { useFetchConnectorTypesQuery } from '../../../rule_management/api/hooks/use_fetch_connector_types_query';
import * as i18n from './translations';
import { RuleSnoozeSection } from './rule_snooze_section';
import { NotificationAction } from './notification_action';
import { ResponseAction } from './response_action';

interface StepRuleActionsProps extends RuleStepProps {
  ruleId?: RuleObjectId; // Rule SO's id (not ruleId)
  actionMessageParams: ActionVariables;
  summaryActionMessageParams: ActionVariables;
  form: FormHook<ActionsStepRule>;
}

interface StepRuleActionsReadOnlyProps {
  addPadding: boolean;
  defaultValues: ActionsStepRule;
}

export const stepActionsDefaultValue: ActionsStepRule = {
  enabled: true,
  actions: [],
  responseActions: [],
  kibanaSiemAppUrl: '',
};

const GhostFormField = () => <></>;

const DisplayActionsHeader = () => {
  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Actions"
            id="xpack.securitySolution.detectionEngine.rule.editRule.actionSectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="l" />
    </>
  );
};

const StepRuleActionsComponent: FC<StepRuleActionsProps> = ({
  ruleId,
  isUpdateView = false,
  actionMessageParams,
  summaryActionMessageParams,
  form,
}) => {
  const {
    services: { application },
  } = useKibana();
  const displayActionsOptions = useMemo(
    () => (
      <>
        <EuiSpacer />
        <UseField
          path="actions"
          component={RuleActionsField}
          componentProps={{
            messageVariables: actionMessageParams,
            summaryMessageVariables: summaryActionMessageParams,
          }}
        />
      </>
    ),
    [actionMessageParams, summaryActionMessageParams]
  );
  const displayResponseActionsOptions = useMemo(() => {
    return (
      <UseArray path="responseActions" initialNumberOfItems={0}>
        {ResponseActionsForm}
      </UseArray>
    );
  }, []);
  // only display the actions dropdown if the user has "read" privileges for actions
  const displayActionsDropDown = useMemo(() => {
    return application.capabilities.actions.show ? (
      <>
        <DisplayActionsHeader />
        {ruleId && <RuleSnoozeSection ruleId={ruleId} />}
        {displayActionsOptions}
        {displayResponseActionsOptions}
        <UseField path="kibanaSiemAppUrl" component={GhostFormField} />
        <UseField path="enabled" component={GhostFormField} />
      </>
    ) : (
      <>
        <EuiText>{i18n.NO_ACTIONS_READ_PERMISSIONS}</EuiText>
      </>
    );
  }, [
    ruleId,
    application.capabilities.actions.show,
    displayActionsOptions,
    displayResponseActionsOptions,
  ]);

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <EuiForm>{displayActionsDropDown}</EuiForm>
        </Form>
      </StepContentWrapper>
    </>
  );
};

export const StepRuleActions = memo(StepRuleActionsComponent);

const StepRuleActionsReadOnlyComponent: FC<StepRuleActionsReadOnlyProps> = ({
  addPadding,
  defaultValues: ruleActionsData,
}) => {
  const {
    services: { triggersActionsUi },
  } = useKibana();

  const actionTypeRegistry = triggersActionsUi.actionTypeRegistry as ActionTypeRegistryContract;

  const { data: connectors } = useFetchConnectorsQuery();
  const { data: connectorTypes } = useFetchConnectorTypesQuery();

  const notificationActions = ruleActionsData.actions;
  const responseActions = ruleActionsData.responseActions || [];

  const ruleHasActions = notificationActions.length > 0 || responseActions.length > 0;

  if (!ruleHasActions || !connectors || !connectorTypes) {
    return null;
  }

  const hasBothNotificationAndResponseActions =
    notificationActions.length > 0 && responseActions.length > 0;

  return (
    <StepContentWrapper addPadding={addPadding}>
      {notificationActions.length > 0 && (
        <>
          <EuiText size="m">{i18n.NOTIFICATION_ACTIONS}</EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {notificationActions.map((action, index) => {
        const isLastItem = index === notificationActions.length - 1;
        return (
          <>
            <NotificationAction
              action={action}
              connectorTypes={connectorTypes}
              connectors={connectors}
              actionTypeRegistry={actionTypeRegistry}
              key={action.id}
            />
            {!isLastItem && <EuiSpacer size="s" />}
          </>
        );
      })}

      {hasBothNotificationAndResponseActions && <EuiSpacer size="l" />}

      {responseActions.length > 0 && (
        <>
          <EuiText size="m">{i18n.RESPONSE_ACTIONS}</EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      {responseActions.map((action, index) => {
        const isLastItem = index === responseActions.length - 1;
        return (
          <>
            <ResponseAction action={action} key={`${action.actionTypeId}-${index}`} />
            {!isLastItem && <EuiSpacer size="s" />}
          </>
        );
      })}
    </StepContentWrapper>
  );
};

export const StepRuleActionsReadOnly = memo(StepRuleActionsReadOnlyComponent);
