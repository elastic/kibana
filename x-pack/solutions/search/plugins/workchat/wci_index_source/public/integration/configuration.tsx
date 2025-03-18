import { IntegrationConfigurationFormProps } from "@kbn/wci-common";
import { WCIIndexSourceConfiguration } from "../../common/types";
import React from "react";

export const IndexSourceConfigurationForm: React.FC<IntegrationConfigurationFormProps<WCIIndexSourceConfiguration>> = ({ configuration }) => {
  return <div>Index source configuration form</div>;
};
