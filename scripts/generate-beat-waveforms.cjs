/* eslint-disable @typescript-eslint/no-require-imports -- Offline asset generation, not shipped to visitors. */
const { chromium } = require('playwright');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

// Print deterministic waveform data to stdout. Regenerate when the audio changes.
// Decoding happens here once, never in the portfolio's runtime player.
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    const result = {};
    for (const name of ['geeked', 'pink-eyes', '30-for-30', 'srt', 'smilin', 'diamonds']) {
      const bytes = await readFile(path.join(__dirname, '..', 'public', 'audio', 'beats', `${name}.mp3`));
      result[`/audio/beats/${name}.mp3`] = await page.evaluate(async base64 => {
        const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
        const decoder = new OfflineAudioContext(1, 1, 44100);
        const audio = await decoder.decodeAudioData(bytes.buffer);
        const count = 128;
        const energy = new Float64Array(count);
        for (let channel = 0; channel < audio.numberOfChannels; channel++) {
          const samples = audio.getChannelData(channel);
          for (let bar = 0; bar < count; bar++) {
            const start = Math.floor(bar * samples.length / count);
            const end = Math.floor((bar + 1) * samples.length / count);
            let sum = 0;
            for (let index = start; index < end; index++) sum += samples[index] * samples[index];
            energy[bar] += sum / (end - start) / audio.numberOfChannels;
          }
        }
        const rms = Array.from(energy, value => Math.sqrt(value));
        const max = Math.max(...rms) || 1;
        return rms.map(value => Number((value / max).toFixed(3)));
      }, bytes.toString('base64'));
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
