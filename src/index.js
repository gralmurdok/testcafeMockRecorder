import prettier from 'prettier'
import fs from 'fs'
import path from 'path'
import {StringDecoder} from 'string_decoder'
import zlib from 'zlib'

const decoder = new StringDecoder('utf8')

class MockDataRecorder {
  constructor(
    options = {
      RequestLogger: null,
      predicate: null,
      record: false, 
      baseDir: ''
    },
  ) {
    this.options = options
    this.logger = null
    this.writeMockData = this.writeMockData.bind(this)
  }

  async startRecording(t, mockData) {
    if(!this.options.record) return

    const {RequestLogger} = this.options
    await t.removeRequestHooks(mockData)
    this.logger = new RequestLogger(
      this.options.predicate || /\.*/,
      {
        logResponseBody: true,
        logResponseHeaders: true,
      },
    )
    await t.addRequestHooks(this.logger)
  }

  writeMockData(filename) {
    if(!this.options.record) return

    const {baseDir = ''} = this.options
    const filePath = path.join(baseDir, filename)
    const {requests = []} = this.logger

    const data = requests
      .filter((elem, pos, arr) => {
        return !!elem && arr.findIndex(subElem => subElem.request.url === elem.request.url) === pos
      })
      .map(loggedRequest => {
        const url = loggedRequest.request.url
        let response = '{}'
        const rawBody = (response = (loggedRequest.response || {}).body)
        const isGzip = ((loggedRequest.response || {}).headers || {})['content-encoding'] === 'gzip'

        switch(true) {
          case !!rawBody && isGzip:
            response = decoder.write(zlib.unzipSync(rawBody))
            break
          case !!rawBody:
            response = decoder.write(rawBody)
            break
          default:
            response = '{}'
        }

        // check if the response is JSON
        try {
          JSON.parse(response)
        } catch(err) {
          return null
        }

        return {
          url,
          response,
        }
      })
      .filter(x => !!x)

    const fileData = data
      .map((rawResponse, index) => {
        return `const callNumber${index} = ${rawResponse.response || '{}'}\n`
      })
      .join('\n')

    const mockedFileData = data
      .map((rawResponse, index) => {
        return (
          `callNumber${index}: new RequestMock()` +
          `.onRequestTo('${rawResponse.url}')` +
          `.respond(callNumber${index}, 200, {'access-control-allow-origin': '*'})`
        )
      })
      .join(',')

    const getAllMocksFn = 'mocks.all = Object.keys(mocks).map(key => mocks[key])\n'

    const mockedFileDataObject = `const mocks = {${mockedFileData}}\n`

    const fileDataString = [
      "import {RequestMock} from 'testcafe'\n",
      fileData,
      mockedFileDataObject,
      getAllMocksFn,
      'export default mocks',
    ].join('\n')

    let prettifiedFileData

    try {
      prettifiedFileData = prettier.format(fileDataString, {
        semi: false,
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: false,
        printWidth: 100,
      })
    } catch(err) {
      prettifiedFileData = fileDataString
    }

    fs.writeFileSync(filePath, prettifiedFileData)
    console.log(`Mock data for ${filename} has been written`)
  }
}

export default MockDataRecorder
