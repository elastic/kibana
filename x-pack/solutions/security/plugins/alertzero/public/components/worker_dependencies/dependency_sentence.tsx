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
          defaultMessage="{label} is off, so Rule Coverage can't receive detection gaps from Continuous Threat Hunt."
          values={{ label }}
        />
      );
    case 'contextEngineAttack':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineAttackSentence"
          defaultMessage="{label} is off, so Endpoint Analysis can't analyze the attacks that Attack Discovery finds."
          values={{ label }}
        />
      );
    case 'contextEngineEndpoint':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineEndpointSentence"
          defaultMessage="{label} is off, so Endpoint Analysis can't read or update investigations."
          values={{ label }}
        />
      );
    case 'contextEngineHunt':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.contextEngineHuntSentence"
          defaultMessage="{label} is off, so Continuous Threat Hunt can't share detection gaps with Rule Coverage."
          values={{ label }}
        />
      );
    case 'alertAnalysisOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.alertAnalysisOffSentence"
          defaultMessage="{label} is off, so Alert Triage can't classify alerts."
          values={{ label }}
        />
      );
    case 'alertAnalysisWorkflowMissing':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.alertAnalysisWorkflowMissingSentence"
          defaultMessage="{label} is missing or disabled, so Alert Triage can't classify alerts."
          values={{ label }}
        />
      );
    case 'attackDiscoveryOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.attackDiscoveryOffSentence"
          defaultMessage="{label} are off, so Attack Discovery can't find potential attacks."
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
          defaultMessage="{label} isn't set up, so Endpoint Analysis can't investigate hosts."
          values={{ label }}
        />
      );
    case 'threatWorkflowOff':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.threatWorkflowOffSentence"
          defaultMessage="{label} workflow is off, so Continuous Threat Hunt might not have any threat reports to compare against your data."
          values={{ label }}
        />
      );
    case 'unverified':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.unverifiedSentence"
          defaultMessage="{label} couldn't be verified. Try again or ask an administrator to check access."
          values={{ label }}
        />
      );
    case 'unverifiedThreatWorkflow':
      return (
        <FormattedMessage
          id="xpack.alertzero.workerDependencies.unverifiedThreatWorkflowSentence"
          defaultMessage="{label} workflow couldn't be verified. Try again, or ask an administrator to check access and restore the workflow if it's missing."
          values={{ label }}
        />
      );
  }
};
