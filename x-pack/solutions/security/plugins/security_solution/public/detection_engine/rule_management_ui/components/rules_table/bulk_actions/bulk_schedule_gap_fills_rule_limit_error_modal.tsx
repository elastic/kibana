/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MAX_BULK_FILL_RULE_GAPS_BULK_SIZE } from '../../../../../../common/constants';
import * as i18n from '../../../../common/translations';
import { BulkActionRuleLimitErrorModal } from './bulk_action_rule_limit_error_modal';

interface BulkManualRuleRunRulesLimitErrorModalProps {
  onClose: () => void;
}

const message = i18n.BULK_FILL_RULE_GAPS_LIMIT_ERROR_MESSAGE(MAX_BULK_FILL_RULE_GAPS_BULK_SIZE);

const BulkFillRuleGapsRuleLimitErrorModalComponent = ({
  onClose,
}: BulkManualRuleRunRulesLimitErrorModalProps) => {
  return <BulkActionRuleLimitErrorModal onClose={onClose} message={message} />;
};

export const BulkFillRuleGapsRuleLimitErrorModal = React.memo(
  BulkFillRuleGapsRuleLimitErrorModalComponent
);

BulkFillRuleGapsRuleLimitErrorModal.displayName = 'BulkFillRuleGapsRuleLimitErrorModal';
