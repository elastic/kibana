import { omit } from 'lodash';
import { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import {
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  fields as TECHNICAL_ALERT_FIELDS,
} from '@kbn/rule-data-utils';

export class AlertData {
  constructor(private alert: any) {}

  getRuleParameters() {
    return this.alert[ALERT_RULE_PARAMETERS];
  }

  getRelevantRuleFields(): Set<string> {
    const ruleParameters = this.getRuleParameters();
    const relevantFields = new Set<string>();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    switch (this.getRuleTypeId()) {
      case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
        const customThresholdParams = ruleParameters as CustomThresholdParams;
        const metrics = customThresholdParams.criteria[0].metrics;
        metrics.forEach((metric) => {
          relevantFields.add(metric.field);
        });
        return relevantFields;
      default:
        return relevantFields;
    }
  }

  getRelevantAADFields(): string[] {
    const ignoredFields = ['_index'];
    const allKibanaFields = Object.keys(this.alert).filter((field) => field.startsWith('kibana.'));
    const nonTechnicalFields = omit(this.alert, [
      ...Object.values(TECHNICAL_ALERT_FIELDS),
      ...allKibanaFields,
      ...ignoredFields,
    ]);
    return Object.keys(nonTechnicalFields);
  }

  getAlertTags(): string[] {
    return this.alert.tags || [];
  }

  getRuleQueryIndex() {
    const ruleParameters = this.getRuleParameters();
    const ruleTypeId = this.getRuleTypeId();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    switch (ruleTypeId) {
      case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
        const customThresholdParams = ruleParameters as CustomThresholdParams;
        return customThresholdParams.searchConfiguration.index;
      default:
        return '';
    }
  }

  getRuleTypeId() {
    return this.alert[ALERT_RULE_TYPE_ID];
  }
}
