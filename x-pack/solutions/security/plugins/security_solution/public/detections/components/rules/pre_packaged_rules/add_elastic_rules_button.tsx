/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { INSTALL_PREBUILT_RULES_ANCHOR } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/rules_management_tour';
import * as i18n from './translations';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../../common';
import { usePrebuiltRulesStatus } from '../../../../detection_engine/rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';

interface AddElasticRulesButtonProps {
  'data-test-subj'?: string;
  fill?: boolean;
  isDisabled: boolean;
  showBadge?: boolean;
}

export const AddElasticRulesButton = ({
  'data-test-subj': dataTestSubj = 'addElasticRulesButton',
  fill,
  isDisabled,
  showBadge = true,
}: AddElasticRulesButtonProps) => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const { onClick: onClickLink } = getSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rulesAdd,
  });

  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const newRulesCount = preBuiltRulesStatus?.num_prebuilt_rules_to_install ?? 0;

  const ButtonComponent = fill ? EuiButton : EuiButtonEmpty;

  return (
    <ButtonComponent
      id={INSTALL_PREBUILT_RULES_ANCHOR}
      fill={fill}
      iconType="plusInCircle"
      color={'primary'}
      onClick={onClickLink}
      data-test-subj={dataTestSubj}
      isDisabled={isDisabled}
    >
      {i18n.ADD_ELASTIC_RULES}
      {newRulesCount > 0 && showBadge && (
        <EuiBadge
          color={'#E0E5EE'}
          css={css`
            margin-left: 5px;
          `}
        >
          {newRulesCount}
        </EuiBadge>
      )}
    </ButtonComponent>
  );
};
