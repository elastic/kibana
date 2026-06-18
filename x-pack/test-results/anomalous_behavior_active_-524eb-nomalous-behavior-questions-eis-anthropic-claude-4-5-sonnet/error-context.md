# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: anomalous_behavior_active_jobs.spec.ts >> SIEM ML Jobs Skill - Anomalous Behavior with Active ML Jobs >> entity analytics anomalous behavior questions
- Location: x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/evals/v1/anomalous_behavior_active_jobs.spec.ts:204:26

# Error details

```
Error: waitForAllJobsToStart exceeded timeout of 300000ms
```

# Test source

```ts
  20  | import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
  21  | import { isJobStarted } from '@kbn/security-solution-plugin/common/machine_learning/helpers';
  22  | 
  23  | // Security Authentication ML module
  24  | export const securityAuthModule = 'security_auth';
  25  | export const securityAuthJobIds = [
  26  |   'auth_rare_source_ip_for_a_user_ea',
  27  |   'suspicious_login_activity_ea',
  28  |   'auth_rare_user_ea',
  29  |   'auth_rare_hour_for_a_user_ea',
  30  | ];
  31  | 
  32  | // Privileged Access Detection (PAD) ML module
  33  | export const padModule = 'pad-ml';
  34  | export const padJobIds = [
  35  |   'pad_linux_rare_process_executed_by_user_ea',
  36  |   'pad_linux_high_count_privileged_process_events_by_user_ea',
  37  | ];
  38  | 
  39  | // Lateral Movement Detection (LMD) ML module
  40  | export const lmdModule = 'lmd-ml';
  41  | export const lmdJobIds = [
  42  |   'lmd_high_count_remote_file_transfer_ea',
  43  |   'lmd_high_file_size_remote_file_transfer_ea',
  44  | ];
  45  | 
  46  | // Security PacketBeat ML module
  47  | export const securityPacketBeatModule = 'security_packetbeat';
  48  | export const securityPacketBeatJobIds = ['packetbeat_rare_server_domain_ea'];
  49  | 
  50  | // Data Exfiltration Detection (DED) ML module
  51  | export const dedModule = 'ded-ml';
  52  | export const dedJobIds = [
  53  |   'ded_high_bytes_written_to_external_device_ea',
  54  |   'ded_high_bytes_written_to_external_device_airdrop_ea',
  55  |   'ded_high_sent_bytes_destination_geo_country_iso_code_ea',
  56  |   'ded_high_sent_bytes_destination_ip_ea',
  57  | ];
  58  | 
  59  | interface ModuleJob {
  60  |   id: string;
  61  |   success: boolean;
  62  |   error?: {
  63  |     status: number;
  64  |   };
  65  | }
  66  | 
  67  | interface ExecuteSetupModuleRequestOpts {
  68  |   module: string;
  69  |   rspCode: number;
  70  |   supertest: SuperTest.Agent;
  71  |   indexPatternName?: string;
  72  | }
  73  | interface ExecuteSetupModuleResult {
  74  |   jobs: ModuleJob[];
  75  | }
  76  | const executeSetupModuleRequest = async ({
  77  |   module,
  78  |   rspCode,
  79  |   supertest,
  80  |   indexPatternName = 'auditbeat-*',
  81  | }: ExecuteSetupModuleRequestOpts): Promise<ExecuteSetupModuleResult> => {
  82  |   const { body } = await supertest
  83  |     .post(`/internal/ml/modules/setup/${module}`)
  84  |     .set(getCommonRequestHeader('1'))
  85  |     .send({
  86  |       prefix: '',
  87  |       groups: [ML_GROUP_ID],
  88  |       indexPatternName,
  89  |       startDatafeed: false,
  90  |       useDedicatedIndex: true,
  91  |       applyToAllSpaces: true,
  92  |     })
  93  |     .expect(rspCode);
  94  | 
  95  |   return body;
  96  | };
  97  | 
  98  | interface SetupMlModulesWithRetryOpts {
  99  |   module: string;
  100 |   supertest: SuperTest.Agent;
  101 |   retries?: number;
  102 |   indexPatternName?: string;
  103 | }
  104 | export const setupMlModulesWithRetry = ({
  105 |   module,
  106 |   supertest,
  107 |   retries = 5,
  108 |   indexPatternName,
  109 | }: SetupMlModulesWithRetryOpts) =>
  110 |   pRetry(
  111 |     async () => {
  112 |       const response = await executeSetupModuleRequest({
  113 |         module,
  114 |         rspCode: 200,
  115 |         supertest,
  116 |         indexPatternName,
  117 |       });
  118 | 
  119 |       const allJobsSucceeded = response?.jobs.every((job) => {
> 120 |         return job.success || (job.error?.status && job.error.status < 500);
      |             ^ Error: waitForAllJobsToStart exceeded timeout of 300000ms
  121 |       });
  122 | 
  123 |       if (!allJobsSucceeded) {
  124 |         throw new Error(
  125 |           `Expected all jobs to set up successfully, but got ${JSON.stringify(response)}`
  126 |         );
  127 |       }
  128 | 
  129 |       return response;
  130 |     },
  131 |     { retries }
  132 |   );
  133 | 
  134 | interface ForceStartDatafeedsOpts {
  135 |   jobIds: string[];
  136 |   rspCode: number;
  137 |   supertest: SuperTest.Agent;
  138 | }
  139 | export const forceStartDatafeeds = async ({
  140 |   jobIds,
  141 |   rspCode,
  142 |   supertest,
  143 | }: ForceStartDatafeedsOpts) => {
  144 |   const { body } = await supertest
  145 |     .post(`/internal/ml/jobs/force_start_datafeeds`)
  146 |     .set(getCommonRequestHeader('1'))
  147 |     .send({
  148 |       datafeedIds: jobIds.map((jobId) => `datafeed-${jobId}`),
  149 |       start: Date.now(),
  150 |     })
  151 |     .expect(rspCode);
  152 | 
  153 |   return body;
  154 | };
  155 | 
  156 | interface GetJobsSummaryOpts {
  157 |   jobIds: string[];
  158 |   supertest: SuperTest.Agent;
  159 | }
  160 | const getJobsSummary = async ({
  161 |   jobIds,
  162 |   supertest,
  163 | }: GetJobsSummaryOpts): Promise<MlSummaryJob[]> => {
  164 |   const { body } = await supertest
  165 |     .post(`/internal/ml/jobs/jobs_summary`)
  166 |     .set(getCommonRequestHeader('1'))
  167 |     .send({
  168 |       jobIds,
  169 |     });
  170 | 
  171 |   return body.filter((job: MlSummaryJob) => jobIds.includes(job.id));
  172 | };
  173 | 
  174 | interface WaitForAllJobsToStartOpts {
  175 |   jobIds: string[];
  176 |   supertest: SuperTest.Agent;
  177 |   log: ToolingLog;
  178 | }
  179 | 
  180 | export const waitForAllJobsToStart = async ({
  181 |   jobIds,
  182 |   supertest,
  183 |   log,
  184 | }: WaitForAllJobsToStartOpts): Promise<MlSummaryJob[]> => {
  185 |   const timeoutMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  186 |   const startTime = Date.now();
  187 | 
  188 |   log.info(`Waiting for ${jobIds.length} job(s) to start: ${jobIds.join(', ')}`);
  189 | 
  190 |   return pRetry(
  191 |     async () => {
  192 |       // Check if we've exceeded the timeout
  193 |       const elapsed = Date.now() - startTime;
  194 |       if (elapsed > timeoutMs) {
  195 |         throw new Error(`waitForAllJobsToStart exceeded timeout of ${timeoutMs}ms`);
  196 |       }
  197 | 
  198 |       const jobs = await getJobsSummary({ jobIds, supertest });
  199 | 
  200 |       // Check if all jobs are found
  201 |       if (jobs.length !== jobIds.length) {
  202 |         const foundJobIds = jobs.map((job) => job.id);
  203 |         const missingJobIds = jobIds.filter((id) => !foundJobIds.includes(id));
  204 |         const errorMsg = `Not all jobs found. Missing: ${missingJobIds.join(', ')}. Expected ${
  205 |           jobIds.length
  206 |         }, found ${jobs.length}`;
  207 |         log.warning(errorMsg);
  208 |         throw new Error(errorMsg);
  209 |       }
  210 | 
  211 |       // Check if all jobs are started
  212 |       const notStartedJobs = jobs.filter((job) => !isJobStarted(job.jobState, job.datafeedState));
  213 |       const startedCount = jobs.length - notStartedJobs.length;
  214 | 
  215 |       if (notStartedJobs.length > 0) {
  216 |         const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  217 |         log.info(
  218 |           `[${elapsedSeconds}s] Status: ${startedCount}/${
  219 |             jobs.length
  220 |           } jobs started. Waiting for: ${notStartedJobs.map((job) => job.id).join(', ')}`
```