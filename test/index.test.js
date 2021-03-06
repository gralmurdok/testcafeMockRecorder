import MockDataRecorder from '../src/index'
import fs from 'fs'
import zlib from 'zlib'

describe('testcafe-mock-recorder', () => {
  let recorder
  class MockClass {}

  beforeEach(() => {
    recorder = new MockDataRecorder({
      RequestLogger: MockClass,
      predicate: request => {
        const captureRegExp = /.*/
        const excludeRegExp = /exclude_this_pattern/
        return captureRegExp.test(request.url) && !excludeRegExp.test(request.url)
      },
      record: true,
      baseDir: 'customdir'
    })
  })

  test('should create a instance of recorder main class', () => {
    expect(recorder).toBeDefined()
  })

  describe('#startRecording', () => {
    let tMock

    beforeEach(() => {
      tMock = {
        addRequestHooks: jest.fn(),
        removeRequestHooks: jest.fn()
      }
    })

    test('should detach current test mocks', async() => {
      await recorder.startRecording(tMock, [])
      expect(tMock.removeRequestHooks).toHaveBeenCalled()
    })

    test('should attach a clean logger', async() => {
      await recorder.startRecording(tMock, [])
      expect(tMock.addRequestHooks).toHaveBeenCalled()
    })
  })

  describe('#writeMockData', () => {
    test('should write mock data even if response body is empty', () => {
      fs.writeFileSync = jest.fn()

      recorder.logger = {
        requests: [{
          request: {
            url: 'https://url.com/testPattern'
          }
        }]
      }

      recorder.writeMockData('testFileName.js')
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'customdir/testFileName.js',
        `import {RequestMock} from 'testcafe'\n\n` +
        `const callNumber0 = {}\n\n` +
        `const mocks = {\n` +
        `  callNumber0: new RequestMock()\n` +
        `    .onRequestTo('https://url.com/testPattern')\n` +
        `    .respond(callNumber0, 200, {'access-control-allow-origin': '*'}),\n` +
        `}\n\n` +
        `mocks.all = Object.keys(mocks).map(key => mocks[key])\n\n` +
        `export default mocks\n`
      )
    })

    test('should write mock data', () => {
      fs.writeFileSync = jest.fn()

      recorder.logger = {
        requests: [{
          request: {
            url: 'https://url.com/testPattern'
          },
          response: {
            body: `{"testParam":"testValue"}`
          }
        }]
      }

      recorder.writeMockData('testFileName.js')
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'customdir/testFileName.js',
        `import {RequestMock} from 'testcafe'\n\n` +
        `const callNumber0 = {testParam: 'testValue'}\n\n` +
        `const mocks = {\n` +
        `  callNumber0: new RequestMock()\n` +
        `    .onRequestTo('https://url.com/testPattern')\n` +
        `    .respond(callNumber0, 200, {'access-control-allow-origin': '*'}),\n` +
        `}\n\n` +
        `mocks.all = Object.keys(mocks).map(key => mocks[key])\n\n` +
        `export default mocks\n`
      )
    })

    test('should write mock data from a gzipped response', () => {
      fs.writeFileSync = jest.fn()
      zlib.unzipSync = jest.fn(() => "{testParam: 'testValue'}")

      recorder.logger = {
        requests: [{
          request: {
            url: 'https://url.com/testPattern'
          },
          response: {
            headers: {
              ['content-encoding']: 'gzip'
            },
            body: "{testParam: 'testValue'}"
          }
        }]
      }

      recorder.writeMockData('testFileName.js')
      expect(zlib.unzipSync).toHaveBeenCalled()
    })
  })
})