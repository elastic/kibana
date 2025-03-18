import { IntegrationConfigurationFormProps } from "@kbn/wci-common";
import { SalesforceConfiguration } from "../../common/types";
import React from "react";
import { EuiDescribedFormGroup } from "@elastic/eui";
import { EuiTextArea } from "@elastic/eui";
import { EuiFormRow } from "@elastic/eui";
import { Controller } from "react-hook-form";

export const SalesforceConfigurationForm: React.FC<IntegrationConfigurationFormProps<SalesforceConfiguration>> = ({ form }) => {

  const { control } = form;

  return (
    <EuiDescribedFormGroup
      ratio="third"
      title={<h3>Salesforce Configuration</h3>}
      description="Configure the salesforce details"
    >
      <EuiFormRow label="Configuration">
        <Controller
          name="configuration"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              data-test-subj="workchatAppIntegrationEditViewAdditionalConfig"
              placeholder="JSON configuration"
              value={JSON.stringify(field.value, null, 2)}
              onChange={(e) => field.onChange(JSON.parse(e.target.value))}
            />
          )}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
