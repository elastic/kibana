/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPopover, EuiText, EuiButtonIcon, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

/**
 * Icon and popover that gives hint to users how to get started with ES|QL rules
 */
export const EsqlInfoIcon = memo(function EsqlInfoIcon(): JSX.Element {
  const { docLinks } = useKibana().services;
  const [isPopoverOpen, { off: closePopover, on: togglePopover }] = useBoolean(false);

  const button = (
    <EuiButtonIcon iconType="iInCircle" onClick={togglePopover} aria-label={i18n.ARIA_LABEL} />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.ruleManagement.esqlQuery.esqlInfoTooltipContent"
          defaultMessage="Check out our {createEsqlRuleTypeLink} to get started using ES|QL rules."
          values={{
            createEsqlRuleTypeLink: (
              <EuiLink href={docLinks.links.securitySolution.createEsqlRuleType} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.ruleManagement.esqlQuery.esqlInfoTooltipLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
});
