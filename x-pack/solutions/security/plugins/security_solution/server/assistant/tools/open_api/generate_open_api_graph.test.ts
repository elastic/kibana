import { generateOpenApiGraph } from "./generate_open_api_graph"

describe('generate', () => {

    it("gen", async ()=>{
        await generateOpenApiGraph()
    })
})