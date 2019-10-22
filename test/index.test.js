import MockDataRecorder from '../src/index'

describe('testcafe-mock-recorder', () => {
  test('should create a instance of recorder main class', () => {
    const recorder = new MockDataRecorder({
      capturePattern: /testPattern/,
      excludePattern: /excludeThisPattern/,
      record: false,
      baseDir: 'customdir'
    })
    expect(true).toBeTruthy()
  })
})