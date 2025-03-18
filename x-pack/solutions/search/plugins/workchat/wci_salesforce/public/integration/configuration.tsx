import { IntegrationConfigurationFormProps } from "@kbn/wci-common";
import { SalesforceConfiguration } from "../../common/types";
import React from "react";

export const SalesforceConfigurationForm: React.FC<IntegrationConfigurationFormProps<SalesforceConfiguration>> = ({ configuration }) => {
  return <div>Salesforce configuration form</div>;
};
