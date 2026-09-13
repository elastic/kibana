/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ActionApprovalPolicy, ActionCategory, ActionImpact } from '@kbn/workflows';

/**
 * One entry of the action catalog: the lightweight, agent-facing projection of
 * an installed action workflow. Mirrors `consts.actionMetadata` on the
 * workflow definition plus the workflow id, so an agent can propose the action
 * without reading the full YAML.
 */
export interface ActionCatalogEntry {
  workflowId: string;
  name: string;
  description?: string;
  category?: ActionCategory;
  impact?: ActionImpact;
  approvalPolicy?: ActionApprovalPolicy;
}

/** Response of `GET /internal/alertzero/actions`. */
export interface ListActionsResponse {
  actions: ActionCatalogEntry[];
  total: number;
}
