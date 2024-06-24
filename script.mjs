import { AudioContext } from 'audio-context'; // Assuming you have audio-context imported

const audioContext = new AudioContext();

// Register the worklet
await audioContext.audioWorklet.addModule('./mixing-processor.js');

import RecorderProcessor from './recorderWorkletProcessor.js'

// When needed, use the imported processors:
const mixingProcessor = new MixingProcessor();
const recorderProcessor = new RecorderProcessor();

let rhythmIntervals = {};
let soundBuffers = {};
let volumeControls = {};
let beatCounter = 1;
let beatIndicatorInterval;
let recorder;
let audioStream;

// Obtenha o valor do BPM global
const globalBPMInput = document.getElementById('globalBPM');
let globalBPM = parseInt(globalBPMInput.value);
if (isNaN(globalBPM) || globalBPM <= 0) globalBPM = 120;

// Função para iniciar o indicador de batidas
function startBeatIndicator(interval) {
    const beatIndicators = document.querySelectorAll('.beat');

    const updateBeatIndicator = () => {
        beatIndicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            if ((beatCounter - 1) === index) {
                indicator.classList.add('active');
            }
        });
        beatCounter = (beatCounter % 4) + 1;
    };

    clearInterval(beatIndicatorInterval);
    beatIndicatorInterval = setInterval(updateBeatIndicator, interval);
}

// Função para parar o indicador de batidas
function stopBeatIndicator() {
    clearInterval(beatIndicatorInterval);
    beatIndicatorInterval = null;
    const beatIndicators = document.querySelectorAll('.beat');
    beatIndicators.forEach(indicator => indicator.classList.remove('active'));
    beatCounter = 1;
}

function startRhythmForPad(padId) {
    if (rhythmIntervals[padId]) {
        clearInterval(rhythmIntervals[padId]);
        delete rhythmIntervals[padId];
        checkAndStopIndicator();
        return;
    }

    const bpmInput = document.getElementById(`bpmPad${padId.slice(-1)}`);
    let bpm = parseInt(bpmInput.value);
    if (isNaN(bpm) || bpm <= 0) bpm = globalBPM;

    const volumeControl = document.getElementById(`volumePad${padId.slice(-1)}`);
    volumeControls[padId] = volumeControl;

    const timing = document.querySelector(`input[name="timingPad${padId.slice(-1)}"]:checked`).value;
    const interval = 60000 / bpm;

    const playSoundForPad = () => {
        if (soundBuffers[padId]) {
            playBuffer(soundBuffers[padId], volumeControl);
        } else {
            let sound;
            if (padId === 'pad1') sound = createOscillator(60);
            if (padId === 'pad2') sound = createOscillator(300);
            if (padId === 'pad3' || padId === 'pad4') sound = createOscillator(200);
            playSound(sound, createAmplitudeEnvelope(), 0.2, volumeControl);
        }
    };

    const now = audioContext.currentTime;
    const intervalInSeconds = interval / 1000;
    const nextBeatTime = Math.ceil(now / intervalInSeconds) * intervalInSeconds;
    const beatsUntilNextBeat1 = (4 - ((beatCounter - 1) % 4)) % 4;
    const firstBeatTime = nextBeatTime + beatsUntilNextBeat1 * intervalInSeconds;

    rhythmIntervals[padId] = setTimeout(() => {
        if (timing === 'onbeat') {
            playSoundForPad();
            rhythmIntervals[padId] = setInterval(playSoundForPad, interval);
        } else {
            rhythmIntervals[padId] = setInterval(() => {
                setTimeout(playSoundForPad, interval / 2);
            }, interval);
        }
    }, (firstBeatTime - now) * 1000);

    if (!beatIndicatorInterval) {
        startBeatIndicator(60000 / globalBPM);
    }
}

function ensureAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log(audioContext);
        console.log(audioContext.state);
    }
}

function createOscillator(frequency) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    return oscillator;
}

function createAmplitudeEnvelope() {
    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, audioContext.currentTime);
    return envelope;
}

function playSound(oscillator, envelope, duration, volumeControl) {
    oscillator.connect(envelope);
    envelope.connect(audioContext.destination);
    envelope.gain.setValueAtTime(volumeControl.value, audioContext.currentTime);
    oscillator.start();
    envelope.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
}

function playBuffer(buffer, volumeControl) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volumeControl.value;
    source.connect(gainNode).connect(audioContext.destination);
    source.start();
}

function checkAndStopIndicator() {
    if (!Object.keys(rhythmIntervals).length) {
        stopBeatIndicator();
    }
}

document.getElementById('stopButton').addEventListener('click', () => {
    Object.keys(rhythmIntervals).forEach(padId => {
        clearInterval(rhythmIntervals[padId]);
        delete rhythmIntervals[padId];
    });
    stopBeatIndicator();
});

document.getElementById('pad1').addEventListener('click', () => {
    ensureAudioContext();
    startRhythmForPad('pad1');
});

document.getElementById('pad2').addEventListener('click', () => {
    ensureAudioContext();
    startRhythmForPad('pad2');
});

document.getElementById('pad3').addEventListener('click', () => {
    ensureAudioContext();
    startRhythmForPad('pad3');
});

document.getElementById('pad4').addEventListener('click', () => {
    ensureAudioContext();
    startRhythmForPad('pad4');
});

// Função para selecionar arquivo para carregar em um pad
document.getElementById('filePad1').addEventListener('change', (event) => {
    const file = event.target.files[0];
    loadSoundFile(file, 'pad1');
});

document.getElementById('filePad2').addEventListener('change', (event) => {
    const file = event.target.files[0];
    loadSoundFile(file, 'pad2');
});

document.getElementById('filePad3').addEventListener('change', (event) => {
    const file = event.target.files[0];
    loadSoundFile(file, 'pad3');
});

document.getElementById('filePad4').addEventListener('change', (event) => {
    const file = event.target.files[0];
    loadSoundFile(file, 'pad4');
});

function loadSoundFile(file, padId) {
    ensureAudioContext();
    const reader = new FileReader();
    reader.onload = (e) => {
        audioContext.decodeAudioData(e.target.result, (buffer) => {
            soundBuffers[padId] = buffer;
        });
    };
    reader.readAsArrayBuffer(file);
}

// Atualizar volume sem interferir na reprodução dos pads
function updateVolume(padId) {
    // Apenas atualiza o volume armazenado para o pad
    const volumeControl = document.getElementById(`volumePad${padId.slice(-1)}`);
    volumeControls[padId] = volumeControl.value;

    // Se o pad estiver reproduzindo, atualize o volume imediatamente
    if (rhythmIntervals[padId]) {
        const envelope = createAmplitudeEnvelope();
        const gainNode = envelope.gain;
        gainNode.setValueAtTime(volumeControl.value, audioContext.currentTime);
    }
}

document.getElementById('volumePad1').addEventListener('input', () => updateVolume('pad1'));
document.getElementById('volumePad2').addEventListener('input', () => updateVolume('pad2'));
document.getElementById('volumePad3').addEventListener('input', () => updateVolume('pad3'));
document.getElementById('volumePad4').addEventListener('input', () => updateVolume('pad4'));
//sliders influenciando na execução dos pads (Resolver)

document.getElementById('volumePad1').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('volumePad2').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('volumePad3').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('volumePad4').addEventListener('click', (event) => {
    event.stopPropagation();
});

document.getElementById('filePad1').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('filePad2').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('filePad3').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('filePad4').addEventListener('click', (event) => {
    event.stopPropagation();
});

document.getElementById('bpmPad1').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('bpmPad2').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('bpmPad3').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('bpmPad4').addEventListener('click', (event) => {
    event.stopPropagation();
});

document.getElementById('onbeat1').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('onbeat2').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('onbeat3').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('onbeat4').addEventListener('click', (event) => {
    event.stopPropagation();
});

document.getElementById('offbeat1').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('offbeat2').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('offbeat3').addEventListener('click', (event) => {
    event.stopPropagation();
});
document.getElementById('offbeat4').addEventListener('click', (event) => {
    event.stopPropagation();
});

// Function to start recording
function startRecording() {
    ensureAudioContext();
  
    // Create a new AudioWorkletProcessor to mix pad audio
    const mixingProcessor = new AudioWorkletProcessor('mixing-processor.js');
    audioContext.audioWorklet.addModule('mixing-processor.js').then(() => {
      const mixingNode = audioContext.createAudioWorkletNode('mixing-processor');
  
      // Connect each pad's output to the mixing node
      for (const padId in rhythmIntervals) {
        const source = audioContext.createMediaStreamSource(rhythmIntervals[padId].stream);
        source.connect(mixingNode);
      }
  
      // Create a MediaRecorder to record the mixed stream
      const recordedStream = mixingNode.getStream();
      recorder = new Recorder(recordedStream);
  
      // Start recording after the worklet is loaded
      recorder.record();
    });
  }

// Function to stop recording
function stopRecording() {
    recorder.stop();
    audioStream.getTracks().forEach(track => track.stop());
    recorder.exportWAV(function(blob) {
      audioBlob = blob;
    });
  }

// Function to download the recorded audio
function downloadRecording() {
    const fileNameInput = document.getElementById('fileNameInput');
    if (!fileNameInput.value) {
      alert('Please enter a filename before downloading.');
      return;
    }
  
    const audioURL = window.URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = audioURL;
    link.download = fileNameInput.value + '.wav';
    link.click();
  }

document.getElementById('startRecordingButton').addEventListener('click', startRecording);
document.getElementById('stopRecordingButton').addEventListener('click', stopRecording);
document.getElementById('downloadButton').addEventListener('click', downloadRecording);
//rever função de gravar, parar e download num formato aceito