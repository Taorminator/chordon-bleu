import {legacyBassTrack,resolveBassTrack,validBassTrack} from './bass-track.js';
import {generateBassTrack} from './bass-generator.js';
window.CHORDON_BASS_API={legacyBassTrack,resolveBassTrack,validBassTrack,generateBassTrack};
window.dispatchEvent(new Event('chordon-bass-ready'));
