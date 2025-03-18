import { SalesforceConfiguration } from "../../common/types";
import React from "react";
import { IntegrationToolComponentProps } from "@kbn/wci-common";

export const SalesforceTool: React.FC<IntegrationToolComponentProps<SalesforceConfiguration>> = ({ configuration }) => {
  return <div>Salesforce Tool</div>;
};
