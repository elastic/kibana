/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { MissingPrivileges } from '../../../../common/entity_analytics/risk_engine';
import { useKibana } from '../../../common/lib/kibana';
import { CommaSeparatedValues } from '../../../detections/components/callouts/missing_privileges_callout/comma_separated_values';

export const MISSING_PRIVILEGES_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageTitle',
  {
    defaultMessage: 'Insufficient privileges',
  }
);

export const MissingPrivilegesCallOutBody: React.FC<MissingPrivileges> = ({
  indexPrivileges,
  clusterPrivileges,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <FormattedMessage
      id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.messageDetail"
      defaultMessage="{essence} {indexPrivileges} {clusterPrivileges} "
      values={{
        essence: (
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.essenceDescription"
              defaultMessage="You need the following privileges to fully access this functionality. Contact your administrator for further assistance. Read more about {docs}."
              values={{
                docs: (
                  <EuiLink
                    href={docLinks.links.securitySolution.entityAnalytics.riskScorePrerequisites}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.riskEngineRequirementsDocLink"
                      defaultMessage="Risk Scoring prerequisites"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        ),
        indexPrivileges:
          indexPrivileges.length > 0 ? (
            <>
              <FormattedMessage
                id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.indexPrivilegesTitle"
                defaultMessage="Missing Elasticsearch index privileges:"
              />
              <ul>
                {indexPrivileges.map(([index, missingPrivileges]) => (
                  <li key={index}>{missingIndexPrivileges(index, missingPrivileges)}</li>
                ))}
              </ul>
            </>
          ) : null,
        clusterPrivileges:
          clusterPrivileges.length > 0 ? (
            <>
              <FormattedMessage
                id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.clusterPrivilegesTitle"
                defaultMessage="Missing Elasticsearch cluster privileges:"
              />
              <ul>
                {clusterPrivileges.map((privilege) => (
                  <li key={privilege}>{privilege}</li>
                ))}
              </ul>
            </>
          ) : null,
      }}
    />
  );
};

const missingIndexPrivileges = (index: string, privileges: string[]) => (
  <FormattedMessage
    id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.missingIndexPrivileges"
    defaultMessage="Missing {privileges} privileges for the {index} index."
    values={{
      privileges: <CommaSeparatedValues values={privileges} />,
      index: <EuiCode>{index}</EuiCode>,
    }}
  />
);
