# Arka dan Pohon Emas — catatan produksi

- MP4: `out/final/arka-dan-pohon-emas_1080x1920_60fps_v1.mp4` — 1080×1920, 60 fps, H.264 + AAC, 137,4 s (VO 135,24 s + penutup gunungan).
- Sumber: proyek Remotion ini (`src/Main.tsx`, `src/audio-plan.json`, `src/words.json`, `src/project.json`).
- Gaya: HIKAYAT (wayang kulit di kelir) — diminta pembeli; cocok untuk dongeng rakyat bermoral.

## Adegan
1. 0–16,6 s: gunungan membuka, desa (pondok, pohon), Arka masuk, mengeluh, mimpi emas.
2. 16,6–55,4 s: hutan, Arka membawa kayu bakar, pohon tua muncul, buah emas menyala, suara pohon, "AKU INGIN EMAS!", buah jatuh → tumpukan emas, Arka tertawa.
3. 55,4–66,9 s: rumah besar, pakaian mewah (mahkota), peti harta, keserakahan (kelir meredup, Arka membesar).
4. 66,9–115,6 s: kembali ke pohon, "EMAS × 10", pohon menasihati, Arka marah dengan kapak (kelir merah), buah terakhir, emas → daun kering (kelir biru dingin), Arka menjerit, berlutut menangis, pohon lenyap dalam cahaya.
5. 115,6–137,4 s: hidup sederhana — matahari, ladang, cangkul, membantu warga, pesan moral dengan tunas bercahaya, gunungan menutup.

## Suara
- Musik: gamelan slendro prosedural orisinal (`npm run style-score -- hikayat`), arc: reflective → curious → playful → tense → dramatic → reflective → hopeful (mayor). Hit gong di "Aku ingin emas" dan saat emas berubah; riser sebelum Arka marah.
- 43 SFX orisinal (gong, kecrek, kendang, chime, magic, swoosh, rumble, thunder, boom) — daftar di `src/audio-plan.json`.
- Ducking otomatis dari VO. Master: −13,99 LUFS, true peak −2,39 dBTP, LRA 4,1; tidak ada jeda sunyi tak terencana.
- Musik belum didengar oleh manusia; kualitas taste perlu dicek pembeli.

## Sinkron
- Waktu kata: forced alignment (265 kata). VO delay di mix +3 ms.
- Sync gate otomatis memberi SYNC FAIL: median selisih frasa 29 ms, tetapi 9 dari 56 awal frasa >250 ms (batas 8). Saya cek 9 titik itu langsung pada gelombang VO: semua awal kata yang di-align jatuh tepat (±60 ms) pada saat suara kembali setelah jeda; detektor gagal karena jeda berisi napas (~−40 dB) sehingga tak terbaca sebagai jeda. Dianggap false alarm, tetap perlu dicek sambil didengar.

## Batasan
- Kualitas render "lite" (lubang tatahan berpola, bayangan tegas tanpa blur, tanpa flicker lampu).
- Musik prosedural, bukan rekaman gamelan asli.
