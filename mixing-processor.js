// mixing-processor.js
export default class MixingProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.mixedBuffer = null; // Buffer for mixed audio
    }
  
    process(inputs, outputs, parameters) {
      const inputBuffer = inputs[0][0]; // Get input buffer
  
      if (!this.mixedBuffer) {
        this.mixedBuffer = new Float32Array(inputBuffer.length); // Initialize mixed buffer
      }
  
      // Mix the input buffer into the mixed buffer
      for (let i = 0; i < inputBuffer.length; i++) {
        this.mixedBuffer[i] += inputBuffer[i];
      }
  
      // Send the mixed buffer to the output
      outputs[0].buffer = this.mixedBuffer;
    }
  }