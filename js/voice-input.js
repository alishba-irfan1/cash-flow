const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onend = function() { stopListening(); };
}

// REAL MICROPHONE SOUND (Short static burst, no synthetic beep)
function playMicSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        
        // Make it sound like a mic click (Bandpass filter)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500; // Higher pitch for tinny mic sound
        filter.Q.value = 1;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); // Quick fade out
        
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        whiteNoise.start();
        whiteNoise.stop(ctx.currentTime + 0.15); // Play only 150ms of noise
    } catch(e) {
        console.log("Audio blocked by browser. Allow audio access.");
    }
}

function startListening() {
    isListening = true;
    playMicSound(); // Play mic sound ON
    document.getElementById('modalMicBtn').classList.add('listening');
}

function stopListening() {
    if(!isListening) return;
    isListening = false;
    playMicSound(); // Play mic sound OFF
    document.getElementById('modalMicBtn').classList.remove('listening');
    try { recognition.stop(); } catch(e) {}
}

function startVoiceForModal() {
    if (!recognition) {
        alert("Voice not supported. Please use Google Chrome.");
        return;
    }
    
    if (isListening) { recognition.stop(); stopListening(); return; }
    startListening();

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript.toLowerCase();
        const numbers = text.match(/\d+/g);
        
        if (numbers && numbers.length >= 2) {
            const price = parseFloat(numbers[numbers.length - 1]);
            const qty = parseFloat(numbers[numbers.length - 2]);
            let name = text.replace(/\d+/g, '').replace(/rupees|rupee|rupaye|rs|plates|cup|cups|piece|pieces/gi, '').replace(/\s+/g, ' ').trim();
            if(name) name = name.charAt(0).toUpperCase() + name.slice(1); else name = "Item";
            
            document.getElementById('posItemName').value = name;
            document.getElementById('posItemQty').value = qty;
            document.getElementById('posItemPrice').value = price;
            addItemToModalList(); // Auto add
        } else if (numbers && numbers.length === 1) {
            document.getElementById('transactionAmount').value = parseFloat(numbers[0]).toFixed(2);
            document.getElementById('transactionDescription').value = text;
        }
        stopListening();
    };

    recognition.onerror = function(event) {
        alert("Mic Error: " + event.error + ". Click Allow in browser if asked.");
        stopListening();
    };

    recognition.start();
}