import { IntegrationToolComponentProps } from "@kbn/wci-common";
import { WCIIndexSourceConfiguration } from "../../common/types";
import React from "react";

export const IndexSourceTool: React.FC<IntegrationToolComponentProps<WCIIndexSourceConfiguration>> = ({ configuration }) => {
  return <div>Index Source Tool</div>;
};
