
import { CasePostRequest, CaseResponse, CasesResponse, CasesFindResponse } from '../../../../plugins/case/common/api';
const defaultUser = { email: null, full_name: null, username: 'elastic' };
export const postCaseReq: CasePostRequest = {
  description: 'This is a brand new case of a bad meanie defacing data',
  title: 'Super Bad Security Issue',
  tags: ['defacement'],
}

export const postCaseResp = (id: string): Partial<CaseResponse> => ({
  id,
  comments: [],
  totalComment: 0,
  connector_id: "none",
  description: "This is a brand new case of a bad meanie defacing data",
  title: 'Super Bad Security Issue',
  tags: ['defacement'],
  closed_by: null,
  created_by: defaultUser,
  external_service: null,
  status: "open",
  updated_by: null
})

export const removeServerGeneratedPropertiesFromCase = (
  config: Partial<CaseResponse>,
): Partial<CaseResponse> => {
  const { closed_at, created_at, updated_at, version, ...rest } = config;
  return rest;
};
