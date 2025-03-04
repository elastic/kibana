import { getEsqlFromContent } from "./common"

describe("common", () => {
    it.each([
        ["```esqlhelloworld```", ['helloworld']],
        ["```esqlhelloworld``````esqlhelloworld```", ['helloworld','helloworld']]
    ])('should add %s and %s', (input: string, expectedResult: string[]) => {
        expect(getEsqlFromContent(input)).toEqual(expectedResult)
    })
})