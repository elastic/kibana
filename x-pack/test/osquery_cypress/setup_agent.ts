import { ToolingLog } from "@kbn/dev-utils";
import axios from 'axios'
import {readdir} from 'fs/promises'
import {execFileSync} from 'child_process'
import {resolve} from 'path'

interface AgentManagerParams {
    user: string;
    password: string;
    kibanaUrl: string;
}

const AGENT_DIR_PATTERN = /elastic-agent-*/
export class AgentManager {
    private directoryPath: string;
    private params: AgentManagerParams;
    private log: ToolingLog
    public constructor(directoryPath: string, params: AgentManagerParams, log: ToolingLog) {
        //TODO: check if the file exists
        this.directoryPath = directoryPath
        this.log = log
        this.params = params
    }

    public async getBinaryPath() {
        const files = await readdir(resolve(this.directoryPath, 'data'))
        return resolve(this.directoryPath, 'data', files.find(file => AGENT_DIR_PATTERN), 'elastic-agent')
    }
    public async setup() {
        this.log.info('Setting the agent up')
        await axios.post(`${this.params.kibanaUrl}/api/fleet/agents/setup`, {}, {
            headers: {
                'kbn-xsrf': 'kibana'
            },
            auth: {
                username: this.params.user,
                password: this.params.password
            }
        })
        const {data: apiKeys} = await axios.get(this.params.kibanaUrl + '/api/fleet/enrollment-api-keys', {auth: {
            username: this.params.user,
            password: this.params.password
        }})
        const agentBinPath = await this.getBinaryPath()
        const args = [
            'enroll',
            `-c "${resolve(this.directoryPath, 'elastic-agent.yml')}"`,
            '--insecure', '-f', '--url=http://localhost:8220',
            `--enrollment-token=${apiKeys.list[0].api_key}`
        ]
        execFileSync(agentBinPath, args, {stdio: 'inherit'})
    }

    public cleanup() {
        this.log.info('Cleaning up the agent process')
    }
}