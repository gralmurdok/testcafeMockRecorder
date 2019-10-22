import MockDataRecorder from '../src/index'
import fs from 'fs'

describe('testcafe-mock-recorder', () => {
  let recorder

  beforeEach(() => {
    recorder = new MockDataRecorder({
      capturePattern: /testPattern/,
      excludePattern: /excludeThisPattern/,
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
    test('should write mock data', () => {
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
  })
})