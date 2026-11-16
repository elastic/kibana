/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

/** One whole sentence per key so translators keep control of word order. */
export type DependencySentenceId =
  | 'contextEngineCoverage'
  | 'contextEngineAttack'
  | 'contextEngineEndpoint'
  | 'contextEngineHunt'
  | 'alertAnalysisOff'
  | 'alertAnalysisWorkflowMissing'
  | 'attackDiscoveryOff'
  | 'attackDiscoveryUnavailable'
  | 'defendMissing'
  | 'threatWorkflowOff'
  | 'threatEnrichOff'
  | 'unverified'
  | 'unverifiedThreatWorkflow';

interface Props {
  sentence: DependencySentenceId;
  /** The dependency name, already wrapped for emphasis by the caller. */
  label: React.ReactNode;
}

export const DependencySentence: React.FC<Props> = ({ sentence, label }) => {
  switch (sentence) {
    case 'contextEngineCoverage':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineCoverageSentence"
          defaultMessage="{label} is needed to receive detection gaps from Continuous Threat Hunt."
          values={{ label }}
        />
      );
    case 'contextEngineAttack':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineAttackSentence"
          defaultMessage="{label} is needed for Endpoint Analysis to analyze these attacks."
          values={{ label }}
        />
      );
    case 'contextEngineEndpoint':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineEndpointSentence"
          defaultMessage="{label} is needed to read and update investigations."
          values={{ label }}
        />
      );
    case 'contextEngineHunt':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineHuntSentence"
          defaultMessage="{label} is needed for Rule Coverage to review the gaps this Worker finds."
          values={{ label }}
        />
      );
    case 'alertAnalysisOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.alertAnalysisOffSentence"
          defaultMessage="{label} is needed to classify new alerts."
          values={{ label }}
        />
      );
    case 'alertAnalysisWorkflowMissing':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.alertAnalysisWorkflowMissingSentence"
          defaultMessage="The {label} is missing or turned off. It's needed to classify new alerts."
          values={{ label }}
        />
      );
    case 'attackDiscoveryOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.attackDiscoveryOffSentence"
          defaultMessage="{label} are needed to find potential attacks."
          values={{ label }}
        />
      );
    case 'attackDiscoveryUnavailable':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.attackDiscoveryUnavailableSentence"
          defaultMessage="{label} are unavailable for this deployment. Ask an administrator to enable them."
          values={{ label }}
        />
      );
    case 'defendMissing':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.defendMissingSentence"
          defaultMessage="{label} is needed to investigate hosts."
          values={{ label }}
        />
      );
    case 'threatWorkflowOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.threatWorkflowOffSentence"
          defaultMessage="The {label} workflow is needed to get new threat reports."
          values={{ label }}
        />
      );
    case 'threatEnrichOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.threatEnrichOffSentence"
          defaultMessage="The {label} workflow is needed to search for indicators from new reports."
          values={{ label }}
        />
      );
    case 'unverified':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.unverifiedSentence"
          defaultMessage="Couldn't check {label}. Try again, or ask an administrator to check your access."
          values={{ label }}
        />
      );
    case 'unverifiedThreatWorkflow':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.unverifiedThreatWorkflowSentence"
          defaultMessage="Couldn't check the {label} workflow. Try again, or ask an administrator to check your access and restore the workflow if it's missing."
          values={{ label }}
        />
      );
  }
};
